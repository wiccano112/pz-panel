import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import ini from 'ini';

const execFileAsync = promisify(execFile);
const INI_PATH = '/opt/pz-server/data/Server/servertest.ini';

export async function getServerStatus(): Promise<'ONLINE' | 'STARTING' | 'OFFLINE'> {
  try {
    const { stdout: statusRaw } = await execFileAsync('docker', [
      'inspect',
      '-f',
      '{{.State.Status}}',
      'pz-server',
    ]);
    const status = statusRaw.trim().toUpperCase();

    if (status !== 'RUNNING') {
      return 'OFFLINE';
    }

    // 1. Direct Kernel UDP Check: Port 16261 is 0x3F85 in /proc/net/udp
    try {
      const { stdout: udpNet } = await execFileAsync('docker', [
        'exec',
        'pz-server',
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
        'pz-server',
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
}

export async function getServerStats() {
  try {
    const { stdout } = await execFileAsync('docker', ['stats', 'pz-server', '--no-stream', '--format', '{"cpu":"{{.CPUPerc}}","ram":"{{.MemUsage}}","net":"{{.NetIO}}"}']);
    return JSON.parse(stdout);
  } catch {
    return { cpu: '0.00%', ram: '0B / 0B', net: '0B / 0B' };
  }
}

export async function getServerUptime(): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync('docker', [
      'inspect',
      '--format', '{{.State.StartedAt}}',
      'pz-server',
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
}

export async function getConnectedPlayers(): Promise<number> {
  try {
    const { stdout } = await execFileAsync('sh', [
      '-c',
      'docker logs pz-server --since 60m 2>&1',
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
}

export async function executeServerAction(action: 'start' | 'stop' | 'restart') {
  try {
    let command = [];
    if (action === 'start') {
      command = ['compose', '-f', '/opt/pz-server/docker-compose.yml', 'up', '-d'];
    } else if (action === 'stop') {
      command = ['compose', '-f', '/opt/pz-server/docker-compose.yml', 'stop'];
    } else if (action === 'restart') {
      command = ['compose', '-f', '/opt/pz-server/docker-compose.yml', 'restart'];
    } else {
      throw new Error('Invalid action');
    }

    await execFileAsync('docker', command);
    return { success: true, message: `Server ${action}ed successfully` };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function readIniFile() {
  try {
    const content = await fs.readFile(INI_PATH, 'utf-8');
    const parsed = ini.parse(content);

    const workshopItems = parsed.WorkshopItems ? String(parsed.WorkshopItems).split(';').filter(Boolean) : [];
    const mods = parsed.Mods ? String(parsed.Mods).split(';').filter(Boolean) : [];
    const rawMaps = parsed.Map ? String(parsed.Map).split(';').filter(Boolean) : [];
    
    // Ensure 'Muldraugh, KY' is in the array and strictly last
    const nonCoreMaps = rawMaps.filter(m => m !== 'Muldraugh, KY');
    const maps = [...nonCoreMaps, 'Muldraugh, KY'];

    return { workshopItems, mods, maps };
  } catch {
    return { workshopItems: [], mods: [], maps: ['Muldraugh, KY'] };
  }
}

export async function saveIniFile(workshopItems: string[], mods: string[], maps: string[]) {
  try {
    const content = await fs.readFile(INI_PATH, 'utf-8');
    const parsed = ini.parse(content);

    parsed.WorkshopItems = workshopItems.filter(Boolean).join(';');
    parsed.Mods = mods.filter(Boolean).join(';');
    
    // Ensure 'Muldraugh, KY' is saved and strictly at the end
    const nonCoreMaps = maps.filter(m => m && m !== 'Muldraugh, KY');
    parsed.Map = [...nonCoreMaps, 'Muldraugh, KY'].join(';');

    const newContent = ini.stringify(parsed);
    await fs.writeFile(INI_PATH, newContent, 'utf-8');
    return true;
  } catch {
    return false;
  }
}
