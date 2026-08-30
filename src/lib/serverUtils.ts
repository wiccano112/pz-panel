import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import ini from 'ini';

const execFileAsync = promisify(execFile);
const INI_PATH = '/opt/pz-server/data/Server/servertest.ini';

export async function getServerStatus(): Promise<'ONLINE' | 'STARTING' | 'OFFLINE'> {
  try {
    const { stdout } = await execFileAsync('docker', [
      'inspect',
      '-f',
      '{{.State.Status}}|{{.State.StartedAt}}',
      'pz-server',
    ]);
    const [statusRaw, startedAtRaw] = stdout.trim().split('|');
    const status = statusRaw?.toUpperCase();

    if (status !== 'RUNNING') {
      return 'OFFLINE';
    }

    if (!startedAtRaw || startedAtRaw === '0001-01-01T00:00:00Z') {
      return 'STARTING';
    }

    const startTimestampSec = Math.floor(new Date(startedAtRaw).getTime() / 1000);
    if (isNaN(startTimestampSec) || startTimestampSec <= 0) {
      return 'STARTING';
    }

    try {
      const { stdout: logs } = await execFileAsync('docker', [
        'logs',
        '--since',
        String(startTimestampSec),
        'pz-server',
      ]);

      if (logs.includes('*** SERVER STARTED ****') || logs.includes('Server is open for connection')) {
        return 'ONLINE';
      }
      return 'STARTING';
    } catch {
      return 'STARTING';
    }
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
    // docker logs doesn't support execFile with shell redirection, so we pipe through sh
    const { stdout } = await execFileAsync('sh', [
      '-c',
      'docker logs pz-server --since 30m 2>&1',
    ]);
    const lines = stdout.split('\n');
    const connected = lines.filter(l => l.includes('PlayerConnected')).length;
    const disconnected = lines.filter(l => l.includes('PlayerDisconnected')).length;
    return Math.max(0, connected - disconnected);
  } catch {
    return 0;
  }
}

export async function executeServerAction(action: 'start' | 'stop' | 'restart') {
  const cwd = '/opt/pz-server';
  try {
    if (action === 'start') {
      await execFileAsync('docker', ['compose', 'up', '-d'], { cwd });
    } else if (action === 'stop') {
      await execFileAsync('docker', ['compose', 'down'], { cwd });
    } else if (action === 'restart') {
      await execFileAsync('docker', ['compose', 'restart'], { cwd });
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function readIniFile() {
  try {
    const content = await fs.readFile(INI_PATH, 'utf-8');
    const parsed = ini.parse(content);
    
    // Convert semicolon-separated strings to arrays
    const workshopItems = parsed.WorkshopItems ? String(parsed.WorkshopItems).split(';').filter(Boolean) : [];
    const mods = parsed.Mods ? String(parsed.Mods).split(';').filter(Boolean) : [];
    const maps = parsed.Map ? String(parsed.Map).split(';').filter(Boolean) : [];

    return { workshopItems, mods, maps };
  } catch (error) {
    console.error('Error reading INI:', error);
    return { workshopItems: [], mods: [], maps: [] };
  }
}

export async function saveIniFile(newWorkshopItems: string[], newMods: string[], newMaps: string[]) {
  try {
    const content = await fs.readFile(INI_PATH, 'utf-8');
    const parsed = ini.parse(content);

    // Ensure Muldraugh, KY is always at the end
    const filteredMaps = newMaps.filter(m => m !== 'Muldraugh, KY');
    filteredMaps.push('Muldraugh, KY');

    parsed.Mods = newMods.join(';');
    parsed.Map = filteredMaps.join(';');
    parsed.WorkshopItems = newWorkshopItems.join(';');

    // Encode back to INI format (removing sections since PZ INI doesn't use them)
    const newContent = ini.stringify(parsed, { whitespace: true });
    
    await fs.writeFile(INI_PATH, newContent, 'utf-8');
    return true;
  } catch (error) {
    console.error('Error saving INI:', error);
    return false;
  }
}
