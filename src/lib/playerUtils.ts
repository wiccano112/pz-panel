import fs from 'fs';
import { DatabaseSync } from 'node:sqlite';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { BannedIp, BannedSteamId, ConnectedPlayer, PlayersOverviewData, WhitelistUser } from '@/types/players';

const execFileAsync = promisify(execFile);
export const PZ_DB_PATH = '/opt/pz-server/data/db/servertest.db';

const ROLE_MAP: Record<number, string> = {
  1: 'Admin',
  2: 'Moderator',
  3: 'Overseer',
  4: 'GM',
  5: 'User',
};

function getDbInstance(): DatabaseSync | null {
  try {
    if (!fs.existsSync(PZ_DB_PATH)) {
      return null;
    }
    const db = new DatabaseSync(PZ_DB_PATH);
    db.exec('PRAGMA busy_timeout = 3000;');
    return db;
  } catch (error) {
    console.error('Failed to open servertest.db:', error);
    return null;
  }
}

export async function getLiveConnectedPlayers(): Promise<ConnectedPlayer[]> {
  try {
    const { stdout } = await execFileAsync('sh', [
      '-c',
      'docker logs pz-server --since 60m 2>&1',
    ]);

    const lines = stdout.split('\n');
    const activeUserMap = new Map<string, ConnectedPlayer>();

    for (const line of lines) {
      if (line.includes('PlayerConnected')) {
        const match = line.match(/PlayerConnected\s+([A-Za-z0-9_-]+)/);
        const username = match ? match[1] : 'Survivor';
        activeUserMap.set(username, {
          username,
          connectedSince: 'Recently',
          role: 'Player',
        });
      } else if (line.includes('PlayerDisconnected')) {
        const match = line.match(/PlayerDisconnected\s+([A-Za-z0-9_-]+)/);
        if (match) {
          activeUserMap.delete(match[1]);
        }
      }
    }

    return Array.from(activeUserMap.values());
  } catch {
    return [];
  }
}

export async function getPlayersOverview(): Promise<PlayersOverviewData> {
  const connectedPlayers = await getLiveConnectedPlayers();
  const db = getDbInstance();

  if (!db) {
    return {
      connectedPlayers,
      whitelist: [],
      bannedSteamIds: [],
      bannedIps: [],
    };
  }

  try {
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

    return {
      connectedPlayers,
      whitelist,
      bannedSteamIds,
      bannedIps,
    };
  } catch (error) {
    console.error('Error querying servertest.db:', error);
    return {
      connectedPlayers,
      whitelist: [],
      bannedSteamIds: [],
      bannedIps: [],
    };
  } finally {
    try {
      db.close();
    } catch {}
  }
}

export function addToWhitelist(payload: {
  username: string;
  role: number;
  steamid?: string;
  displayName?: string;
}): { success: boolean; error?: string } {
  const db = getDbInstance();
  if (!db) return { success: false, error: 'Database unavailable' };

  try {
    const stmt = db.prepare(
      'INSERT INTO whitelist (username, role, steamid, displayName) VALUES (?, ?, ?, ?)'
    );
    stmt.run(
      payload.username.trim(),
      payload.role,
      payload.steamid?.trim() || null,
      payload.displayName?.trim() || null
    );
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  } finally {
    try {
      db.close();
    } catch {}
  }
}

export function removeFromWhitelist(id: number): { success: boolean; error?: string } {
  const db = getDbInstance();
  if (!db) return { success: false, error: 'Database unavailable' };

  try {
    const stmt = db.prepare('DELETE FROM whitelist WHERE id = ?');
    stmt.run(id);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  } finally {
    try {
      db.close();
    } catch {}
  }
}

export function banSteamId(payload: { steamid: string; reason?: string }): { success: boolean; error?: string } {
  const db = getDbInstance();
  if (!db) return { success: false, error: 'Database unavailable' };

  try {
    const stmt = db.prepare('INSERT OR REPLACE INTO bannedid (steamid, reason) VALUES (?, ?)');
    stmt.run(payload.steamid.trim(), payload.reason?.trim() || 'Banned via PZ-Panel');
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  } finally {
    try {
      db.close();
    } catch {}
  }
}

export function unbanSteamId(steamid: string): { success: boolean; error?: string } {
  const db = getDbInstance();
  if (!db) return { success: false, error: 'Database unavailable' };

  try {
    const stmt = db.prepare('DELETE FROM bannedid WHERE steamid = ?');
    stmt.run(steamid.trim());
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  } finally {
    try {
      db.close();
    } catch {}
  }
}

export function banIp(payload: { ip: string; username?: string; reason?: string }): { success: boolean; error?: string } {
  const db = getDbInstance();
  if (!db) return { success: false, error: 'Database unavailable' };

  try {
    const stmt = db.prepare('INSERT OR REPLACE INTO bannedip (ip, username, reason) VALUES (?, ?, ?)');
    stmt.run(
      payload.ip.trim(),
      payload.username?.trim() || null,
      payload.reason?.trim() || 'Banned via PZ-Panel'
    );
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  } finally {
    try {
      db.close();
    } catch {}
  }
}

export function unbanIp(ip: string): { success: boolean; error?: string } {
  const db = getDbInstance();
  if (!db) return { success: false, error: 'Database unavailable' };

  try {
    const stmt = db.prepare('DELETE FROM bannedip WHERE ip = ?');
    stmt.run(ip.trim());
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  } finally {
    try {
      db.close();
    } catch {}
  }
}

export async function sendServerBroadcast(message: string): Promise<{ success: boolean; error?: string }> {
  try {
    const sanitizedMsg = message.replace(/["$`\\]/g, '');
    await execFileAsync('docker', [
      'exec',
      'pz-server',
      'sh',
      '-c',
      `echo "servermsg \\"${sanitizedMsg}\\"" >> /home/steam/server-console.txt 2>/dev/null || true`,
    ]);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}
