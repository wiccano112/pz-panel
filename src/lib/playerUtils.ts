import fs from 'fs';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { CONFIG } from '@/lib/config';
import { ROLE_MAP, CACHE_TTL_MS } from '@/constants/game';
import { getOrSetCache } from '@/lib/cache';
import { BannedIp, BannedSteamId, ConnectedPlayer, PlayersOverviewData, WhitelistUser, PlayerConnectionEvent } from '@/types/players';

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


export function parsePzLogTimestampToUtc(rawTimestamp: string): Date | null {
  if (!rawTimestamp || typeof rawTimestamp !== 'string') return null;
  const match = rawTimestamp.trim().match(/^(\d{2})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?$/);
  if (!match) return null;
  const [, day, month, year, hours, minutes, seconds, ms = '0'] = match;
  const fullYear = 2000 + parseInt(year, 10);
  const padMs = ms.padEnd(3, '0').slice(0, 3);
  const d = new Date(`${fullYear}-${month}-${day}T${hours}:${minutes}:${seconds}.${padMs}Z`);
  return isNaN(d.getTime()) ? null : d;
}

export function formatToClt(dateOrRaw: Date | string): string {
  if (!dateOrRaw) return '';
  const date = typeof dateOrRaw === 'string' ? parsePzLogTimestampToUtc(dateOrRaw) : dateOrRaw;
  if (!date || isNaN(date.getTime())) {
    return typeof dateOrRaw === 'string' ? dateOrRaw : '';
  }
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Santiago',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    return `${formatter.format(date).replace(',', '')} CLT`;
  } catch {
    return typeof dateOrRaw === 'string' ? dateOrRaw : date.toISOString();
  }
}

export interface LogFileEntry {
  fullPath: string;
  name: string;
}

export async function collectLogFiles(logsDir: string): Promise<{ userFiles: LogFileEntry[]; connFiles: LogFileEntry[] }> {
  const userFiles: LogFileEntry[] = [];
  const connFiles: LogFileEntry[] = [];

  async function scanDir(currentDir: string): Promise<void> {
    try {
      const items = await fs.promises.readdir(currentDir);
      for (const item of items) {
        const itemName = typeof item === 'string' ? item : (item as { name: string }).name;
        if (!itemName) continue;
        const fullPath = path.join(currentDir, itemName);
        if (itemName.startsWith('logs_')) {
          await scanDir(fullPath);
        } else if (itemName.endsWith('_user.txt')) {
          userFiles.push({ fullPath, name: itemName });
        } else if (itemName.endsWith('_connections.txt')) {
          connFiles.push({ fullPath, name: itemName });
        }
      }
    } catch {
      // Ignore read errors for inaccessible folders
    }
  }

  await scanDir(logsDir);
  userFiles.sort((a, b) => b.name.localeCompare(a.name));
  connFiles.sort((a, b) => b.name.localeCompare(a.name));
  return { userFiles, connFiles };
}

export async function getLiveConnectedPlayers(): Promise<ConnectedPlayer[]> {
  return getOrSetCache('live_connected_players', CACHE_TTL_MS, async () => {
    const activeUserMap = new Map<string, ConnectedPlayer>();
    const logsDir = path.join(CONFIG.serverDir, 'data', 'Logs');
    let logFilesFound = false;
    // 1. Primary Strategy: Parse PZ session log files in data/Logs/
    if (fs.existsSync(logsDir)) {
      try {
        const { userFiles, connFiles } = await collectLogFiles(logsDir);

        if (userFiles.length > 0 || connFiles.length > 0) {
          logFilesFound = true;
        }

        // Parse latest user.txt for connection/disconnection lifecycles
        if (userFiles.length > 0) {
          const latestUserFile = userFiles[0].fullPath;
          const content = await fs.promises.readFile(latestUserFile, 'utf-8');
          const lines = content.split(/\r?\n/);

          for (const line of lines) {
            // e.g. [02-09-26 04:29:21.534] 76561198044212417 "wiccano112" fully connected (8117,12232,0).
            const connectMatch = line.match(/\[(.*?)\]\s+(\d+)\s+"(.*?)"\s+fully connected/);
            if (connectMatch) {
              const [, rawTimestamp, steamid, username] = connectMatch;
              activeUserMap.set(username, {
                username,
                steamid,
                connectedSince: formatToClt(rawTimestamp),
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

        // Parse latest connections.txt for richer network metadata (IP, role) for currently active users
        if (connFiles.length > 0 && activeUserMap.size > 0) {
          const latestConnFile = connFiles[0].fullPath;
          const content = await fs.promises.readFile(latestConnFile, 'utf-8');
          const lines = content.split(/\r?\n/);

          for (const line of lines) {
            const userMatch = line.match(/username="([^"]+)"/);
            if (userMatch && userMatch[1] && activeUserMap.has(userMatch[1])) {
              const username = userMatch[1];
              const ipMatch = line.match(/ip="([^"]+)"/);
              const steamMatch = line.match(/steam-id="([^"]+)"/);
              const roleMatch = line.match(/role="([^"]+)"/);
              const existing = activeUserMap.get(username)!;

              if (ipMatch && ipMatch[1] && ipMatch[1] !== 'null') existing.ip = ipMatch[1];
              if (steamMatch && steamMatch[1] && steamMatch[1] !== '0') existing.steamid = steamMatch[1];
              if (roleMatch && roleMatch[1]) existing.role = roleMatch[1];
            }
          }
        }
      } catch (err) {
        console.error('Error reading PZ log files for active players:', err);
      }
    }

    // 2. Fallback: Parse docker logs only if no log files were found
    if (!logFilesFound && activeUserMap.size === 0) {
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

export async function getPlayerConnectionHistory(limit = 100): Promise<PlayerConnectionEvent[]> {
  return getOrSetCache('player_connection_history', CACHE_TTL_MS, async () => {
    const logsDir = path.join(CONFIG.serverDir, 'data', 'Logs');
    const events: PlayerConnectionEvent[] = [];

    if (!fs.existsSync(logsDir)) {
      return [];
    }

    try {
      const { userFiles, connFiles } = await collectLogFiles(logsDir);

      const globalIpMap = new Map<string, string>();
      const globalSteamMap = new Map<string, string>();
      const sessionIpMap = new Map<string, Map<string, string>>();
      const sessionSteamMap = new Map<string, Map<string, string>>();

      // 1. Build session-specific & global IP / Steam mapping from connections.txt
      for (const file of connFiles) {
        const prefix = file.name.replace(/_connections\.txt$/, '');
        const sIpMap = new Map<string, string>();
        const sSteamMap = new Map<string, string>();

        try {
          const content = await fs.promises.readFile(file.fullPath, 'utf-8');
          const lines = content.split(/\r?\n/);
          for (const line of lines) {
            const userMatch = line.match(/username="([^"]+)"/);
            const ipMatch = line.match(/ip="([^"]+)"/);
            const steamMatch = line.match(/steam-id="([^"]+)"/);
            if (userMatch && userMatch[1] && userMatch[1] !== 'null') {
              const u = userMatch[1];
              if (ipMatch && ipMatch[1] && ipMatch[1] !== 'null') {
                sIpMap.set(u, ipMatch[1]);
                if (!globalIpMap.has(u)) {
                  globalIpMap.set(u, ipMatch[1]);
                }
              }
              if (steamMatch && steamMatch[1] && steamMatch[1] !== '0') {
                sSteamMap.set(u, steamMatch[1]);
                if (!globalSteamMap.has(u)) {
                  globalSteamMap.set(u, steamMatch[1]);
                }
              }
            }
          }
        } catch {
          // ignore error reading single file
        }

        sessionIpMap.set(prefix, sIpMap);
        sessionSteamMap.set(prefix, sSteamMap);
      }

      // 2. Parse user.txt files (from newest file to oldest, lines in reverse order)
      for (const file of userFiles) {
        const prefix = file.name.replace(/_user\.txt$/, '');
        const sessIp = sessionIpMap.get(prefix);
        const sessSteam = sessionSteamMap.get(prefix);

        try {
          const content = await fs.promises.readFile(file.fullPath, 'utf-8');
          const lines = content.split(/\r?\n/);

          for (let i = lines.length - 1; i >= 0; i--) {
            const line = lines[i].trim();
            if (!line) continue;

            // Connection pattern
            const connectMatch = line.match(/\[(.*?)\]\s+(?:(\d+)\s+)?"(.*?)"\s+fully connected(?:\s+\((.*?)\))?/);
            if (connectMatch) {
              const [, rawTimestamp, steamid, username, coordinates] = connectMatch;
              events.push({
                id: `${rawTimestamp}-${username}-CONNECT-${events.length}`,
                timestamp: formatToClt(rawTimestamp),
                rawTimestamp,
                username,
                steamid: steamid || sessSteam?.get(username) || globalSteamMap.get(username) || undefined,
                ip: sessIp?.get(username) || globalIpMap.get(username) || undefined,
                type: 'CONNECTED',
                coordinates: coordinates ? coordinates.replace(/,/g, ', ') : undefined,
              });
              if (events.length >= limit) break;
              continue;
            }

            // Disconnection pattern
            const disconnectMatch = line.match(/\[(.*?)\]\s+(?:(\d+)\s+)?"(.*?)"\s+disconnected(?:\s+player(?:\s+"(?:.*?)")?(?:\s+\((.*?)\))?)?/);
            if (disconnectMatch) {
              const [, rawTimestamp, steamid, username, coordinates] = disconnectMatch;
              events.push({
                id: `${rawTimestamp}-${username}-DISCONNECT-${events.length}`,
                timestamp: formatToClt(rawTimestamp),
                rawTimestamp,
                username,
                steamid: steamid || sessSteam?.get(username) || globalSteamMap.get(username) || undefined,
                ip: sessIp?.get(username) || globalIpMap.get(username) || undefined,
                type: 'DISCONNECTED',
                coordinates: coordinates ? coordinates.replace(/,/g, ', ') : undefined,
              });
              if (events.length >= limit) break;
              continue;
            }
          }

          if (events.length >= limit) break;
        } catch {
          // ignore error reading single file
        }
      }
    } catch (err) {
      console.error('Error reading PZ log files for connection history:', err);
    }

    return events.slice(0, limit);
  });
}

export async function getPlayersOverview(): Promise<PlayersOverviewData> {
  const [connectedPlayers, connectionHistory] = await Promise.all([
    getLiveConnectedPlayers(),
    getPlayerConnectionHistory(),
  ]);

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
    connectionHistory,
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
