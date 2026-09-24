---
name: pz-config-engine
description: >-
  Complete guide and runbook for parsing, validating, serializing, and staging Project Zomboid
  INI and Lua Sandbox configuration files. Use when modifying server settings, sandbox variables,
  mods lists, map orders, or implementing configuration staging mechanisms.
---

# Project Zomboid Configuration & Staging Engine Guide

This skill provides step-by-step procedures and rules for safely reading, modifying, and saving Project Zomboid configuration files.

---

## 1. Key Configuration Files & Roles

File | Location | Format | Critical Details
:--- | :--- | :--- | :---
**Server INI** | `data/Server/<SERVER_NAME>.ini` | Key-Value (`key=value`) | Controls mods, workshop IDs, ports, passwords, PVP.
**Sandbox Lua** | `data/Server/<SERVER_NAME>_SandboxVars.lua` | Lua Table (`SandboxVars = { ... }`) | Controls zombie population, loot, XP multipliers, day length.
**Spawn Regions** | `data/Server/<SERVER_NAME>_spawnregions.lua` | Lua Function Table | Defines spawn points for player professions/maps.
**World Binary** | `data/Saves/Multiplayer/<SERVER_NAME>/map_sand.bin` | Binary | Cache of sandbox settings for an existing world.

---

## 2. Critical PZ Domain Quirks & Rules

### A. Semicolon Delimiters in INI Lists (NEVER Escape with Backslash `\`)
Project Zomboid uses standard semicolons (`;`) to separate items in list properties (`Mods`, `WorkshopItems`, `Map`):
```ini
Mods=modA;modB;modC
WorkshopItems=123456;789012
Map=CustomMap;Muldraugh, KY
```
* **CRITICAL INVARIANT:** Do **NOT** escape semicolons (`\;`).
* **Why?** The PZ Java backend reads properties and invokes `.split(";")` without unescaping. If formatted as `123456\;789012`, tokens become `123456\` and `789012`. SteamCMD fails to parse numeric IDs ending in `\`, skipping mod downloads, and the game engine reports `required mod "X\" not found`.
* **Rule:** Always format array values with `.join(';')` when serializing to `.ini`.

### B. Lua String Sanitization & Injection Prevention
When generating Lua code for `_SandboxVars.lua`:
* Never concatenate raw user input into Lua tables.
* Validate all fields with strict Zod schemas (`sandboxVarsSchema`).
* Escape string values:
  ```typescript
  export function sanitizeLuaString(val: string): string {
    return val.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
  }
  ```

### C. The `map_sand.bin` Persistence Gotcha
* **Warning:** In Project Zomboid, editing `_SandboxVars.lua` **does NOT retroactively apply to already explored chunks or existing worlds** because the server prioritizes `map_sand.bin` inside the active save directory.
* **UI Banner Requirement:** Always show an informational alert in the UI explaining that some sandbox changes require a world reset or manual `map_sand.bin` synchronization.

### D. Staging Mechanism (`.staged` files)
* **The Problem:** Modifying `.ini` or `.lua` files while `pz-server` is actively running causes Java to overwrite disk files on server shutdown during memory flush.
* **The Solution:** 
  1. Write modifications to `<file>.staged`.
  2. Display a pending restart indicator in the UI.
  3. When the server is safely stopped/restarted, atomically rename `<file>.staged` to `<file>`.

---

## 3. Safe Editing Checklist
- [ ] Zod schema validation passes.
- [ ] INI list values are joined with standard semicolon `;` (NO backslashes).
- [ ] Lua strings are sanitized against code injection.
- [ ] If the server is running, write to `.staged` first.
- [ ] Run unit tests: `pnpm test tests/sandboxUtils.test.ts tests/serverUtils.test.ts`.
