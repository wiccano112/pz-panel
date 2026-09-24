---
name: pz-mod-management
description: >-
  Comprehensive guide and rules for managing Project Zomboid mods and Steam Workshop items,
  map loading order, Build 42 compatibility, and preventing WorldDictionary save corruption.
  Use when adding, removing, updating mods, configuring workshop items, setting up custom maps,
  or diagnosing client connection errors (e.g., WorldDictionaryException).
---

# Project Zomboid Mod Management & WorldDictionary Integrity Guide

This skill provides deterministic rules, workflows, and troubleshooting runbooks for managing mods, Steam Workshop items, map layers, and world dictionaries in Project Zomboid dedicated servers.

---

## 1. Anatomy of a Project Zomboid Mod

Every Workshop modification in Project Zomboid has two distinct identifiers:

Identifier | Example | Defined In | Purpose
:--- | :--- | :--- | :---
**Steam Workshop ID** | `2847184718` | Steam Workshop URL | Instructs SteamCMD what asset package to download.
**Mod ID** | `ProximityInventory` | `mod.info` (`id=...`) | Instructs the Java game engine what mod to mount and execute.
**Map Folder Name** | `RavenCreek` | `media/maps/<Folder>` | (Optional) Folder name of custom terrain tiles to load into the metagrid.

> [!WARNING]
> A single Workshop item may contain **multiple Mod IDs** (e.g., base mod + optional sub-mods or compatibility bridges). Always inspect `mod.info` files within the workshop folder or the Steam description to identify all required Mod IDs.

---

## 2. The Four Invariable Mod Rules

### Rule 1: Workshop-to-Mod 1:1 Correlation
* Every Workshop ID in `WorkshopItems` **MUST** have its corresponding Mod ID in `Mods`.
* If a Workshop ID is added without its Mod ID, SteamCMD downloads the files, but the server engine never loads the mod.
* If a Mod ID is added without its Workshop ID, the server crashes or warns `required mod "X" not found` because the files were never downloaded.

### Rule 2: Standard Semicolon Delimiters (NEVER Escape with Backslash `\`)
* Properties in `data/Server/<SERVER_NAME>.ini` use standard semicolons:
  ```ini
  Mods=errorMagnifier;AutoMechanics;ProximityInventory
  WorkshopItems=2896041179;3387539308;2847184718
  Map=RavenCreek;Muldraugh, KY
  ```
* **Why NO backslashes?** The Java INI parser runs `.split(";")` without unescaping. If written as `modA\;modB`, the tokens become `modA\` and `modB`.
  - SteamCMD treats `2896041179\` as an invalid numeric ID and drops the download query.
  - Java searches for the directory `modA\` on disk and logs `required mod "modA" not found`.

### Rule 3: Map Mod Layer Hierarchy
* Custom map mods **MUST strictly precede** the vanilla map layer in the `Map=` directive:
  ```ini
  Map=CustomMapFolder;Muldraugh, KY
  ```
* The engine evaluates map cells from left to right. If vanilla (`Muldraugh, KY`) is placed first, vanilla world chunks will overwrite custom map chunks.

### Rule 4: Mutation at Rest Only
* Configuration files (`.ini`, `.lua`) must **NEVER** be modified while the server container is actively running.
* The Java server caches configurations in RAM and flushes world state on shutdown, silently overwriting any manual edits made while running.
* **Always** use staging (`.staged` files) or execute `docker compose down` before editing.

---

## 3. WorldDictionary Protection & Save Invariants

### What is `WorldDictionary`?
In Project Zomboid (particularly Build 42+), `WorldDictionary.bin` located at:
`data/Saves/Multiplayer/<SERVER_NAME>/WorldDictionary.bin`
tracks every custom item, sprite configuration, craft recipe, and entity script that has ever been loaded or spawned in the save.

### The Missing Dictionary Script Crash
```text
ERROR: General f:0 st:0> WorldDictionary.init> Exception thrown
zombie.world.WorldDictionaryException: [SpriteConfigs] Missing dictionary script on client: ModName.ItemName at ScriptsDictionary$ScriptRegister.parseLoadListClient.
zombie.world.WorldDictionaryException: WorldDictionary: Cannot load world due to WorldDictionary error.
```

### Why this happens:
1. A mod adding custom items or structures (e.g., `ChevalDeFriseFix` with `WoodenChevalDeFrise`) was active when the world was created or played.
2. The mod is removed from `Mods=` in `NobaraZomboid.ini`.
3. The server starts, but the existing save still contains references to `ModName.ItemName` in `WorldDictionary.bin`.
4. A client connects: the server transmits the registered dictionary.
5. The client checks its loaded mod scripts. Because the mod is no longer active, the client lacks the script definition.
6. The client **aborts loading and disconnects immediately** to prevent save corruption.

### Mitigation & Safe Mod Removal:
* **Golden Rule:** Never remove item-bearing mods from an ongoing multiplayer world.
* If a mod must be uninstalled:
  1. Destroy all placed objects and delete all inventories containing the mod's items in-game first.
  2. If the error persists, use community dictionary repair scripts (`fix_worlddict.py`) to clear stale `isLoaded` flags, or perform a world reset (`soft_reset.sh`).
  3. **DO NOT** simply delete `WorldDictionary.bin` without backups, as item IDs will remap and scramble all existing loot in containers.

---

## 4. Build 42 (B42) Compatibility Quirks

* **Directory Layout:** B42 mods often place assets in `mods/<ModID>/42/` or `mods/<ModID>/42.15/` with `versionMin=42.X` in `mod.info`.
* **Common Non-Fatal Log Warnings in B42:**
  - `ERROR: Lua ... handleMannequinZone > missing properties`: Base game data omission in `Muldraugh, KY/objects.lua`. Safe to ignore.
  - `ERROR: General ... Basements.mergeRoomsOntoMetaCell > duplicate RoomDef.metaID`: Procedural basement room index collision. Safe to ignore.
  - `WARN: Animation ... AnimState not found: turning180`: Upstream base game turn transition omission. Safe to ignore.

---

## 5. Deterministic Mod Injection Pipeline

Follow these exact steps when adding or updating mods:

```bash
# 1. Audit active player connections
docker exec pz-server rcon-cli -a "127.0.0.1:27015" -p "$RCON_PASSWORD" "players"

# 2. Stop container gracefully (flushes world state to disk)
docker compose down

# 3. Backup active configuration
cp data/Server/<SERVER_NAME>.ini data/Server/<SERVER_NAME>.ini.bak

# 4. Update NobaraZomboid.ini with standard semicolons:
#    Append Workshop ID to WorkshopItems
#    Append Mod ID to Mods
#    (If map mod: prepend map folder to Map)

# 5. Start container (triggers SteamCMD download + validation)
docker compose up -d

# 6. Verify mod loading in stdout log:
docker compose logs --tail=100 -f | grep -E "Workshop:|loading|SERVER STARTED"
```
