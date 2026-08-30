import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import ini from 'ini';
import { CONFIG } from '@/lib/config';
import { CORE_MAP_NAME, CACHE_TTL_MS } from '@/constants/game';
import { withLock } from '@/lib/mutex';
import { getOrSetCache, invalidateCache } from '@/lib/cache';

const execFileAsync = promisify(execFile);

export async function getServerStatus(): Promise<'ONLINE' | 'STARTING' | 'OFFLINE'> {
  return getOrSetCache('server_status', CACHE_TTL_MS, async () => {
    try {
      const { stdout: statusRaw } = await execFileAsync('docker', [
        'inspect',
        '-f',
        '{{.State.Status}}',
        CONFIG.containerName,
      ]);
      const status = statusRaw.trim().toUpperCase();

      if (status !== 'RUNNING') {
        return 'OFFLINE';
      }

      // 1. Direct Kernel UDP Check: Port 16261 is 0x3F85 in /proc/net/udp
      try {
        const { stdout: udpNet } = await execFileAsync('docker', [
          'exec',
          CONFIG.containerName,
          'cat',
          '/proc/net/udp',
        ]);

        if (udpNet.includes(':3F85 ')) {
          return 'ONLINE';
        }
      } catch {}

      // 2. Fallback check: Inspect recent tail logs
      try {
        const { stdout: logs, stderr } = await execFileAsync('docker', [
          'logs',
          '--tail',
          '300',
          CONFIG.containerName,
        ]);
        const fullLog = `${logs} ${stderr}`;

        if (fullLog.includes('*** SERVER STARTED ****') || fullLog.includes('Server is open for connection')) {
          return 'ONLINE';
        }
      } catch {}

      return 'STARTING';
    } catch {
      return 'OFFLINE';
    }
  });
}

export async function getServerStats(): Promise<{ cpu: string; ram: string; net: string }> {
  return getOrSetCache('server_stats', CACHE_TTL_MS, async () => {
    try {
      const { stdout } = await execFileAsync('docker', [
        'stats',
        CONFIG.containerName,
        '--no-stream',
        '--format',
        '{"cpu":"{{.CPUPerc}}","ram":"{{.MemUsage}}","net":"{{.NetIO}}"}',
      ]);
      return JSON.parse(stdout);
    } catch {
      return { cpu: '0.00%', ram: '0B / 0B', net: '0B / 0B' };
    }
  });
}

export async function getServerUptime(): Promise<string | null> {
  return getOrSetCache('server_uptime', CACHE_TTL_MS, async () => {
    try {
      const { stdout } = await execFileAsync('docker', [
        'inspect',
        '--format',
        '{{.State.StartedAt}}',
        CONFIG.containerName,
      ]);
      const startedAt = stdout.trim();
      if (!startedAt || startedAt === '0001-01-01T00:00:00Z') return null;

      const startMs = new Date(startedAt).getTime();
      if (isNaN(startMs)) return null;

      let diffSec = Math.floor((Date.now() - startMs) / 1000);
      if (diffSec < 0) return null;

      const days = Math.floor(diffSec / 86400);
      diffSec %= 86400;
      const hours = Math.floor(diffSec / 3600);
      diffSec %= 3600;
      const minutes = Math.floor(diffSec / 60);
      const seconds = diffSec % 60;

      if (days > 0) {
        return `${days}d ${hours}h ${minutes}m`;
      } else if (hours > 0) {
        return `${hours}h ${minutes}m`;
      } else {
        return `${minutes}m ${seconds}s`;
      }
    } catch {
      return null;
    }
  });
}

export async function getConnectedPlayers(): Promise<number> {
  return getOrSetCache('connected_players_count', CACHE_TTL_MS, async () => {
    try {
      const { stdout } = await execFileAsync('docker', [
        'logs',
        CONFIG.containerName,
        '--since',
        '60m',
      ]);

      const lines = stdout.split('\n');
      let count = 0;

      for (const line of lines) {
        if (line.includes('PlayerConnected')) {
          count++;
        } else if (line.includes('PlayerDisconnected')) {
          count = Math.max(0, count - 1);
        }
      }

      return count;
    } catch {
      return 0;
    }
  });
}

export async function executeServerAction(action: 'start' | 'stop' | 'restart') {
  try {
    let command: string[] = [];
    if (action === 'start') {
      command = ['compose', '-f', CONFIG.composeFile, 'up', '-d'];
    } else if (action === 'stop') {
      command = ['compose', '-f', CONFIG.composeFile, 'stop'];
    } else if (action === 'restart') {
      command = ['compose', '-f', CONFIG.composeFile, 'restart'];
    } else {
      throw new Error('Invalid action');
    }

    await execFileAsync('docker', command);
    invalidateCache();
    return { success: true, message: `Server ${action}ed successfully` };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function readIniFile() {
  try {
    const content = await fs.readFile(CONFIG.iniPath, 'utf-8');
    const parsed = ini.parse(content);

    const workshopItems = parsed.WorkshopItems ? String(parsed.WorkshopItems).split(';').filter(Boolean) : [];
    const mods = parsed.Mods ? String(parsed.Mods).split(';').filter(Boolean) : [];
    const rawMaps = parsed.Map ? String(parsed.Map).split(';').filter(Boolean) : [];
    
    // Ensure CORE_MAP_NAME is in the array and strictly last
    const nonCoreMaps = rawMaps.filter(m => m !== CORE_MAP_NAME);
    const maps = [...nonCoreMaps, CORE_MAP_NAME];

    return { workshopItems, mods, maps };
  } catch {
    return { workshopItems: [], mods: [], maps: [CORE_MAP_NAME] };
  }
}

export async function saveIniFile(workshopItems: string[], mods: string[], maps: string[]): Promise<boolean> {
  return withLock('ini_config_file', async () => {
    try {
      const content = await fs.readFile(CONFIG.iniPath, 'utf-8');
      const parsed = ini.parse(content);

      parsed.WorkshopItems = workshopItems.filter(Boolean).join(';');
      parsed.Mods = mods.filter(Boolean).join(';');
      
      // Ensure CORE_MAP_NAME is saved and strictly at the end
      const nonCoreMaps = maps.filter(m => m && m !== CORE_MAP_NAME);
      parsed.Map = [...nonCoreMaps, CORE_MAP_NAME].join(';');

      const newContent = ini.stringify(parsed);
      
      // Atomic write via temporary file
      const tmpPath = `${CONFIG.iniPath}.tmp.${Date.now()}`;
      await fs.writeFile(tmpPath, newContent, 'utf-8');
      await fs.rename(tmpPath, CONFIG.iniPath);

      invalidateCache();
      return true;
    } catch (error) {
      console.error('Failed to save INI file:', error);
      return false;
    }
  });
}

export async function readServerProperties(): Promise<Record<string, string>> {
  try {
    const content = await fs.readFile(CONFIG.iniPath, 'utf-8');
    const parsed = ini.parse(content) as Record<string, unknown>;
    const properties: Record<string, string> = {};

    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'object' && value !== null) {
        for (const [subKey, subVal] of Object.entries(value as Record<string, unknown>)) {
          properties[`${key}.${subKey}`] = String(subVal ?? '');
        }
      } else {
        properties[key] = String(value ?? '');
      }
    }

    return properties;
  } catch (error) {
    console.error('Failed to read server properties from INI:', error);
    return {};
  }
}

export async function saveServerProperties(
  updatedProps: Record<string, string | number | boolean>
): Promise<{ success: boolean; error?: string }> {
  return withLock('ini_config_file', async () => {
    try {
      let parsed: Record<string, unknown> = {};
      try {
        const content = await fs.readFile(CONFIG.iniPath, 'utf-8');
        parsed = ini.parse(content) as Record<string, unknown>;
      } catch {
        parsed = {};
      }

      for (const [key, val] of Object.entries(updatedProps)) {
        if (typeof val === 'boolean') {
          parsed[key] = val ? 'true' : 'false';
        } else {
          parsed[key] = String(val);
        }
      }

      const newContent = ini.stringify(parsed);

      // Atomic write via temporary file
      const tmpPath = `${CONFIG.iniPath}.tmp.${Date.now()}`;
      await fs.writeFile(tmpPath, newContent, 'utf-8');
      await fs.rename(tmpPath, CONFIG.iniPath);

      invalidateCache();
      return { success: true };
    } catch (error) {
      console.error('Failed to save server properties:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });
}

