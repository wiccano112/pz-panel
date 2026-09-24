---
name: pz-server-topology
description: >-
  Detailed architecture, directory structure, container volumes, permission model, and networking
  topology of the underlying Project Zomboid dedicated server. Use when interacting with pz-server
  files, Docker commands, volume mounts, ports, user permissions, or diagnosing server initialization.
---

# Project Zomboid Server Architecture & Topology Guide

This skill provides comprehensive architectural specifications and operational topology for the Project Zomboid dedicated server (`pz-server`) managed by `pz-panel`.

---

## 1. System Topology & Runtime Specification

* **Runtime:** Docker / Docker Compose.
* **Base Image:** `indifferentbroccoli/projectzomboid-server-docker:latest`.
* **Underlying Stack:** Debian/Ubuntu userland with SteamCMD runtime & 64-bit Java OpenJDK Runtime Environment (JRE).
* **Server Identification Key:** `SERVER_NAME` (defined in `.env`, controls file prefixes, database names, and save directory names).
* **Host Volume Mount:** `./data` on host maps to `/project-zomboid-config` in container.
* **Container Working Directory:** `/home/steam/server` or `/project-zomboid`.
* **User & Group ID:** `PUID=1000`, `PGID=1000` (configurable in `.env`).

---

## 2. Directory Structure & Path Identifiers

```text
pz-server/
├── docker-compose.yml                     # Container orchestration & env configuration
├── .env                                   # Active environment variables (SERVER_NAME, ports, passwords)
├── .env.example                           # Template environment variables
├── AGENTS.md                              # Operational specification for AI agents
├── scripts/                               # Automation runbooks (backup, safe_restart, etc.)
└── data/                                  # Mounted as /project-zomboid-config (ignored in git)
    ├── options.ini                        # Graphic/Audio server fallback options
    ├── server-console.txt                 # Runtime stdout/stderr log output
    ├── backups/                           # Automated server archives (.zip / .tar.gz)
    ├── db/<SERVER_NAME>.db                # SQLite user authentication, whitelist, and ban DB
    ├── Logs/                              # Timestamped session logs, chat logs, user audits
    ├── Saves/Multiplayer/<SERVER_NAME>/   # Active World State:
    │   ├── map/                           # Binary map chunk tiles (*.bin)
    │   ├── chunkdata/                     # Serialized map item states & container contents
    │   ├── isoregiondata/                 # Structural interior containment data
    │   ├── zpop/                          # Zombie population grid
    │   ├── apop/                          # Animal population grid (Build 42)
    │   ├── players.db                     # SQLite 3 database: Player characters, coords & inventories
    │   ├── vehicles.db                    # SQLite 3 database: Vehicle spawn positions, parts, condition
    │   ├── WorldDictionary.bin            # Binary registry mapping item/tile names to integer IDs
    │   ├── map_meta.bin                   # Room metadata cache
    │   └── map_sand.bin                   # World sandbox parameters snapshot
    └── Server/                            # Core server configuration files:
        ├── <SERVER_NAME>.ini              # Server properties, mods, ports, networking
        ├── <SERVER_NAME>_SandboxVars.lua  # Game mechanics, loot, zombie traits, climate
        ├── <SERVER_NAME>_spawnpoints.lua  # Vector spawn coordinates
        └── <SERVER_NAME>_spawnregions.lua # Regional spawn definitions
```

---

## 3. Network Interfaces & Ports

Port | Protocol | Purpose | Routing Constraint
:--- | :--- | :--- | :---
`16261` | UDP | Primary game loop, physics sync, client handshake | Must be forwarded directly without packet modification.
`16262` | UDP | Direct client connection handoff / Steam relay | Required for client game traffic.
`27015` | TCP | Steam Master Server Query protocol & RCON administrative listener | Administrative access & server browser discovery.

---

## 4. Permission Integrity Model

* All files created or updated in `./data` from the host system must preserve ownership:
  ```bash
  chown -R 1000:1000 data/
  chmod -R 664 data/
  chmod 775 data/ data/Server/ data/db/ data/Logs/ data/backups/
  ```
* If files are created by `root` or another user, the Java server process (running as user `steam` / UID 1000) will fail to read or write, causing silent save failures or startup aborts.

---

## 5. Container Lifecycle & Graceful Shutdown

```text
[IDLE/STOPPED] ──(docker compose up -d)──> [CONTAINER_START]
                                                  │
                                          [STEAMCMD_UPDATE] (Downloads PZ + Workshop Items)
                                                  │
                                          [SERVER_INITIALIZE] (Parses .ini, .lua, SQLite)
                                                  │
                                          [LISTENING: 16261/16262/27015]
                                                  │
[RUNNING] ──────(docker compose down)────> [SIGTERM -> WORLD_FLUSH -> GRACEFUL_HALT]
```

* **SIGTERM (Safe):** Project Zomboid catches `SIGTERM` (sent by `docker compose down` or `docker stop -t 60`). It executes `SaveWorld` and flushes SQLite databases cleanly before exiting.
* **SIGKILL / kill -9 (DANGEROUS):** Abrupt termination aborts mid-write, corrupting SQLite databases (`players.db`, `vehicles.db`) or chunk metadata (`map_t.bin`). Always provide at least **60 seconds timeout** (`-t 60`).
* **Player Connection Invariant:** Before executing `docker compose down` or stopping the container, ALWAYS check connected players via RCON (`players`) or server logs. Never disconnect active players without warning.
