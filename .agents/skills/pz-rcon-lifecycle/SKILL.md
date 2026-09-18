---
name: pz-rcon-lifecycle
description: >-
  Safe operational procedures for Project Zomboid container lifecycle management via RCON
  and Docker socket. Use when implementing server restart, stop, player detection,
  or maintenance actions to prevent save corruption and zero-downtime issues.
---

# Project Zomboid RCON & Server Lifecycle Guide

This skill describes the non-destructive, safe procedures for interacting with the live Project Zomboid game server container (`pz-server`).

---

## 1. Safety Rules & Invariants

1. **Isolation Invariant:** Never run `docker stop`, `docker restart`, or `docker rm` directly on `pz-server` during frontend panel testing or web container updates.
2. **SQLite Database Flush:** Project Zomboid flushes world data and player databases (`data/db/<server>.db`) slowly to disk upon receiving stop signals.
3. **Graceful Timeout:** Always provide at least **60 seconds timeout** (`docker stop -t 60 pz-server`) when stopping or restarting the game server to avoid corrupted SQLite tables.

---

## 2. Safe Restart / Stop Flow (UI & Backend Actions)

```
[User triggers Restart/Stop]
             │
             ▼
[Check Live Connected Players via RCON / logs]
             │
             ├── If players active ➔ Show warning modal with player count & names
             └── If confirmed / 0 players ➔ Proceed
             │
             ▼
[Send RCON 'save' command to PZ server]
             │
             ▼
[Graceful Shutdown: docker stop -t 60 pz-server]
             │
             ▼
[Sync Staged Configurations (.staged -> production files)]
             │
             ▼
[Start Container: docker start pz-server]
```

---

## 3. RCON Command Helper Examples

* **Save World State:**
  ```typescript
  await sendRconSaveCommand(); // Sends 'save' via RCON to force Java RAM flush
  ```
* **Broadcast Announcement to Players:**
  ```typescript
  await sendRconCommand('servermsg "Server will restart in 5 minutes for maintenance."');
  ```
