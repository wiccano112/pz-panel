import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import ini from 'ini';

const execFileAsync = promisify(execFile);
const INI_PATH = '/opt/pz-server/data/Server/servertest.ini';

export async function getServerStatus() {
  try {
    const { stdout } = await execFileAsync('docker', ['inspect', '-f', '{{.State.Status}}', 'pz-server']);
    return stdout.trim().toUpperCase();
  } catch (error) {
    return 'OFFLINE';
  }
}

export async function getServerStats() {
  try {
    const { stdout } = await execFileAsync('docker', ['stats', 'pz-server', '--no-stream', '--format', '{"cpu":"{{.CPUPerc}}","ram":"{{.MemUsage}}","net":"{{.NetIO}}"}']);
    return JSON.parse(stdout);
  } catch (error) {
    return { cpu: '0.00%', ram: '0B / 0B', net: '0B / 0B' };
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
  } catch (error: any) {
    return { success: false, error: error.message };
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
    let filteredMaps = newMaps.filter(m => m !== 'Muldraugh, KY');
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
