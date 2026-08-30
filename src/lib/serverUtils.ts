import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
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

// Helper functions to parse and serialize PZ INI files correctly preserving semicolons and comments
function parsePzIni(content: string): Record<string, string> {
  const props: Record<string, string> = {};
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = line.indexOf('=');
    if (eqIdx !== -1) {
      const key = line.slice(0, eqIdx).trim();
      const val = line.slice(eqIdx + 1).trim();
      props[key] = val;
    }
  }
  return props;
}

function updatePzIni(content: string, newProps: Record<string, string | number | boolean>): string {
  const lines = content.split(/\r?\n/);
  const updatedKeys = new Set<string>();
  const resultLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      resultLines.push(line);
      continue;
    }
    const eqIdx = line.indexOf('=');
    if (eqIdx !== -1) {
      const key = line.slice(0, eqIdx).trim();
      if (key in newProps) {
        resultLines.push(`${key}=${String(newProps[key])}`);
        updatedKeys.add(key);
      } else {
        resultLines.push(line);
      }
    } else {
      resultLines.push(line);
    }
  }

  // Append any new keys that were not in the original file
  for (const [k, v] of Object.entries(newProps)) {
    if (!updatedKeys.has(k)) {
      resultLines.push(`${k}=${String(v)}`);
    }
  }

  return resultLines.join('\n');
}

export async function readIniFile() {
  try {
    const content = await fs.readFile(CONFIG.iniPath, 'utf-8');
    const parsed = parsePzIni(content);

    const workshopItems = parsed.WorkshopItems ? parsed.WorkshopItems.split(';').filter(Boolean) : [];
    const mods = parsed.Mods ? parsed.Mods.split(';').filter(Boolean) : [];
    const rawMaps = parsed.Map ? parsed.Map.split(';').filter(Boolean) : [];
    
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
      let content = '';
      try {
        content = await fs.readFile(CONFIG.iniPath, 'utf-8');
      } catch {
        content = '';
      }

      // Ensure CORE_MAP_NAME is saved and strictly at the end
      const nonCoreMaps = maps.filter(m => m && m !== CORE_MAP_NAME);
      const mapVal = [...nonCoreMaps, CORE_MAP_NAME].join(';');

      const updated = updatePzIni(content, {
        WorkshopItems: workshopItems.filter(Boolean).join(';'),
        Mods: mods.filter(Boolean).join(';'),
        Map: mapVal,
      });
      
      // Ensure target directory exists
      await fs.mkdir(path.dirname(CONFIG.iniPath), { recursive: true });

      // Atomic write via temporary file
      const tmpPath = `${CONFIG.iniPath}.tmp.${Date.now()}`;
      await fs.writeFile(tmpPath, updated, 'utf-8');
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
    return parsePzIni(content);
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
      let content = '';
      try {
        content = await fs.readFile(CONFIG.iniPath, 'utf-8');
      } catch {
        content = '';
      }

      const formattedProps: Record<string, string | number | boolean> = {};
      for (const [key, val] of Object.entries(updatedProps)) {
        if (typeof val === 'boolean') {
          formattedProps[key] = val ? 'true' : 'false';
        } else {
          formattedProps[key] = val;
        }
      }

      const updated = updatePzIni(content, formattedProps);

      // Ensure target directory exists
      await fs.mkdir(path.dirname(CONFIG.iniPath), { recursive: true });

      // Atomic write via temporary file
      const tmpPath = `${CONFIG.iniPath}.tmp.${Date.now()}`;
      await fs.writeFile(tmpPath, updated, 'utf-8');
      await fs.rename(tmpPath, CONFIG.iniPath);

      invalidateCache();
      return { success: true };
    } catch (error) {
      console.error('Failed to save server properties:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });
}



