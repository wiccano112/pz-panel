import fs from 'fs';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { CONFIG } from '@/lib/config';
import { ROLE_MAP, CACHE_TTL_MS } from '@/constants/game';
import { getOrSetCache } from '@/lib/cache';
import { BannedIp, BannedSteamId, ConnectedPlayer, PlayersOverviewData, WhitelistUser } from '@/types/players';

const execFileAsync = promisify(execFile);

interface GlobalSqliteStore {
  __pz_sqlite_db?: DatabaseSync;
  __pz_sqlite_db_path?: string;
}

const globalSqlite = globalThis as unknown as GlobalSqliteStore;

function getDatabase(): DatabaseSync | null {
  if (!fs.existsSync(CONFIG.dbPath)) {
    return null;
  }
  if (globalSqlite.__pz_sqlite_db && globalSqlite.__pz_sqlite_db_path === CONFIG.dbPath) {
    return globalSqlite.__pz_sqlite_db;
  }
  if (globalSqlite.__pz_sqlite_db) {
    try {
      globalSqlite.__pz_sqlite_db.close();
    } catch {}
  }
  const db = new DatabaseSync(CONFIG.dbPath);
  db.exec('PRAGMA busy_timeout = 3000;');
  db.exec('PRAGMA journal_mode = WAL;');
  globalSqlite.__pz_sqlite_db = db;
  globalSqlite.__pz_sqlite_db_path = CONFIG.dbPath;
  return db;
}

function withDb<T>(operation: (db: DatabaseSync) => T): { success: boolean; data?: T; error?: string } {
  try {
    const db = getDatabase();
    if (!db) {
      return { success: false, error: `Database file not found at ${CONFIG.dbPath}` };
    }
    const result = operation(db);
    return { success: true, data: result };
  } catch (error) {
    console.error('Database operation error:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}


export async function getLiveConnectedPlayers(): Promise<ConnectedPlayer[]> {
  return getOrSetCache('live_connected_players', CACHE_TTL_MS, async () => {
    const activeUserMap = new Map<string, ConnectedPlayer>();
    const logsDir = path.join(CONFIG.serverDir, 'data', 'Logs');

    // 1. Primary Strategy: Parse PZ session log files in data/Logs/
    if (fs.existsSync(logsDir)) {
      try {
        const allFiles = await fs.promises.readdir(logsDir);
        const userFiles = allFiles.filter((f) => f.endsWith('_user.txt')).sort().reverse();
        const connFiles = allFiles.filter((f) => f.endsWith('_connections.txt')).sort().reverse();

        // Parse latest user.txt for connection/disconnection lifecycles
        if (userFiles.length > 0) {
          const latestUserFile = path.join(logsDir, userFiles[0]);
          const content = await fs.promises.readFile(latestUserFile, 'utf-8');
          const lines = content.split(/\r?\n/);

          for (const line of lines) {
            // e.g. [02-09-26 04:29:21.534] 76561198044212417 "wiccano112" fully connected (8117,12232,0).
            const connectMatch = line.match(/\[(.*?)\]\s+(\d+)\s+"(.*?)"\s+fully connected/);
            if (connectMatch) {
              const [, timestamp, steamid, username] = connectMatch;
              activeUserMap.set(username, {
                username,
                steamid,
                connectedSince: timestamp,
                role: 'Player',
              });
              continue;
            }

            // e.g. [31-08-26 05:37:06.416] 76561198044212417 "wiccano112" disconnected player
            const disconnectMatch = line.match(/\[(.*?)\]\s+(\d+)\s+"(.*?)"\s+disconnected/);
            if (disconnectMatch) {
              const [, , , username] = disconnectMatch;
              activeUserMap.delete(username);
              continue;
            }
          }
        }

        // Parse latest connections.txt for richer network metadata (IP, role)
        if (connFiles.length > 0) {
          const latestConnFile = path.join(logsDir, connFiles[0]);
          const content = await fs.promises.readFile(latestConnFile, 'utf-8');
          const lines = content.split(/\r?\n/);

          for (const line of lines) {
            if (line.includes('fully-connected') || line.includes('player-connect')) {
              const userMatch = line.match(/username="([^"]+)"/);
              const ipMatch = line.match(/ip="([^"]+)"/);
              const steamMatch = line.match(/steam-id="([^"]+)"/);
              const roleMatch = line.match(/role="([^"]+)"/);
              const timeMatch = line.match(/\[(.*?)\]/);

              if (userMatch && userMatch[1] && userMatch[1] !== 'null') {
                const username = userMatch[1];
                const existing = activeUserMap.get(username) || { username };
                activeUserMap.set(username, {
                  ...existing,
                  username,
                  steamid: steamMatch && steamMatch[1] !== '0' ? steamMatch[1] : existing.steamid,
                  ip: ipMatch && ipMatch[1] !== 'null' ? ipMatch[1] : existing.ip,
                  role: roleMatch && roleMatch[1] ? roleMatch[1] : existing.role || 'Player',
                  connectedSince: existing.connectedSince || timeMatch?.[1] || 'Recently',
                });
              }
            } else if (line.includes('event="disconnected"') || line.includes('connection-closed')) {
              const userMatch = line.match(/username="([^"]+)"/);
              if (userMatch && userMatch[1]) {
                activeUserMap.delete(userMatch[1]);
              }
            }
          }
        }
      } catch (err) {
        console.error('Error reading PZ log files for active players:', err);
      }
    }

    // 2. Fallback: Parse docker logs if no log files were found
    if (activeUserMap.size === 0) {
      try {
        const { stdout } = await execFileAsync('docker', [
          'logs',
          CONFIG.containerName,
          '--since',
          '60m',
        ]);

        const lines = stdout.split('\n');
        for (const line of lines) {
          const connectMatch = line.match(/Steam client (\d+) is initiating a connection/i);
          if (connectMatch) {
            const steamid = connectMatch[1];
            activeUserMap.set(`Steam_${steamid.slice(-4)}`, {
              username: `Steam_${steamid.slice(-4)}`,
              steamid,
              connectedSince: 'Recently',
              role: 'Player',
            });
          }
        }
      } catch {
        // Fallback error ignored
      }
    }

    // 3. Cross-reference with Whitelist table to enrich roles
    withDb((db) => {
      const users = db.prepare('SELECT username, role, steamid FROM whitelist').all() as Array<{
        username: string;
        role: number;
        steamid: string | null;
      }>;

      for (const [username, player] of activeUserMap.entries()) {
        const matched = users.find(
          (u) =>
            u.username.toLowerCase() === username.toLowerCase() ||
            (u.steamid && player.steamid && u.steamid === player.steamid)
        );
        if (matched) {
          activeUserMap.set(username, {
            ...player,
            role: ROLE_MAP[matched.role] || player.role || 'Player',
          });
        }
      }
    });

    return Array.from(activeUserMap.values());
  });
}

export async function getPlayersOverview(): Promise<PlayersOverviewData> {
  const connectedPlayers = await getLiveConnectedPlayers();

  const dbRes = withDb((db) => {
    // 1. Whitelist
    const rawWhitelist = db
      .prepare('SELECT id, username, role, lastConnection, steamid, displayName FROM whitelist ORDER BY id DESC')
      .all() as Array<{
      id: number;
      username: string | null;
      role: number;
      lastConnection: string | null;
      steamid: string | null;
      displayName: string | null;
    }>;

    const whitelist: WhitelistUser[] = rawWhitelist.map((w) => ({
      id: w.id,
      username: w.username || 'Unnamed',
      role: w.role,
      roleName: ROLE_MAP[w.role] || `Role ${w.role}`,
      lastConnection: w.lastConnection,
      steamid: w.steamid,
      displayName: w.displayName,
    }));

    // 2. Banned Steam IDs
    const rawBannedIds = db
      .prepare('SELECT steamid, reason FROM bannedid')
      .all() as Array<{ steamid: string; reason: string | null }>;

    const bannedSteamIds: BannedSteamId[] = rawBannedIds.map((b) => ({
      steamid: b.steamid,
      reason: b.reason || 'No reason provided',
    }));

    // 3. Banned IPs
    const rawBannedIps = db
      .prepare('SELECT ip, username, reason FROM bannedip')
      .all() as Array<{ ip: string; username: string | null; reason: string | null }>;

    const bannedIps: BannedIp[] = rawBannedIps.map((b) => ({
      ip: b.ip,
      username: b.username,
      reason: b.reason || 'No reason provided',
    }));

    return { whitelist, bannedSteamIds, bannedIps };
  });

  return {
    connectedPlayers,
    whitelist: dbRes.data?.whitelist || [],
    bannedSteamIds: dbRes.data?.bannedSteamIds || [],
    bannedIps: dbRes.data?.bannedIps || [],
  };
}

export function addToWhitelist(payload: {
  username: string;
  role: number;
  steamid?: string;
  displayName?: string;
}): { success: boolean; error?: string } {
  return withDb((db) => {
    const stmt = db.prepare(
      'INSERT INTO whitelist (username, role, steamid, displayName) VALUES (?, ?, ?, ?)'
    );
    stmt.run(
      payload.username.trim(),
      payload.role,
      payload.steamid?.trim() || null,
      payload.displayName?.trim() || null
    );
    return true;
  });
}

export function removeFromWhitelist(id: number): { success: boolean; error?: string } {
  return withDb((db) => {
    const stmt = db.prepare('DELETE FROM whitelist WHERE id = ?');
    stmt.run(id);
    return true;
  });
}

export function banSteamId(payload: { steamid: string; reason?: string }): { success: boolean; error?: string } {
  return withDb((db) => {
    const stmt = db.prepare('INSERT OR REPLACE INTO bannedid (steamid, reason) VALUES (?, ?)');
    stmt.run(payload.steamid.trim(), payload.reason?.trim() || 'Banned via PZ-Panel');
    return true;
  });
}

export function unbanSteamId(steamid: string): { success: boolean; error?: string } {
  return withDb((db) => {
    const stmt = db.prepare('DELETE FROM bannedid WHERE steamid = ?');
    stmt.run(steamid.trim());
    return true;
  });
}

export function banIp(payload: { ip: string; username?: string; reason?: string }): { success: boolean; error?: string } {
  return withDb((db) => {
    const stmt = db.prepare('INSERT OR REPLACE INTO bannedip (ip, username, reason) VALUES (?, ?, ?)');
    stmt.run(
      payload.ip.trim(),
      payload.username?.trim() || null,
      payload.reason?.trim() || 'Banned via PZ-Panel'
    );
    return true;
  });
}

export function unbanIp(ip: string): { success: boolean; error?: string } {
  return withDb((db) => {
    const stmt = db.prepare('DELETE FROM bannedip WHERE ip = ?');
    stmt.run(ip.trim());
    return true;
  });
}

export async function sendServerBroadcast(message: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Sanitize message: strip newlines and control characters, limit length
    const cleanMessage = message.replace(/[\r\n\x00-\x1F]/g, ' ').trim();
    if (!cleanMessage) {
      return { success: false, error: 'Broadcast message cannot be empty' };
    }

    // Base64 encode the payload to ensure 100% shell injection safety
    const b64 = Buffer.from(cleanMessage, 'utf-8').toString('base64');

    await execFileAsync('docker', [
      'exec',
      CONFIG.containerName,
      'sh',
      '-c',
      `printf 'servermsg "%s"\\n' "$(echo "${b64}" | base64 -d)" >> /home/steam/server-console.txt 2>/dev/null || true`,
    ]);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}
