import fs from 'fs/promises';
import { SandboxVarsData } from '@/types/sandbox';

export const SANDBOX_LUA_PATH = '/opt/pz-server/data/Server/servertest_SandboxVars.lua';

export async function readSandboxVars(): Promise<SandboxVarsData> {
  try {
    const content = await fs.readFile(SANDBOX_LUA_PATH, 'utf-8');
    const result: SandboxVarsData = {};

    let currentSubTable: string | null = null;
    const subTableMap: Record<string, Record<string, string | number | boolean>> = {};

    const lines = content.split('\n');
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('--') || line.startsWith('SandboxVars = {') || line === '}') {
        continue;
      }

      // Check sub-table start: e.g. "ZombieLore = {"
      const subTableMatch = line.match(/^([A-Za-z0-9_]+)\s*=\s*\{/);
      if (subTableMatch) {
        currentSubTable = subTableMatch[1];
        subTableMap[currentSubTable] = {};
        continue;
      }

      // Check sub-table end: e.g. "},"
      if (line === '},' || line === '}') {
        if (currentSubTable) {
          result[currentSubTable] = subTableMap[currentSubTable];
          currentSubTable = null;
        }
        continue;
      }

      // Key-value pair: e.g. "Zombies = 4," or "Speed = 2," or "Nutrition = true,"
      const kvMatch = line.match(/^([A-Za-z0-9_]+)\s*=\s*(.+?)(?:,)?$/);
      if (kvMatch) {
        const key = kvMatch[1];
        let valRaw = kvMatch[2].trim();
        if (valRaw.endsWith(',')) valRaw = valRaw.slice(0, -1).trim();

        let parsedVal: string | number | boolean = valRaw;

        if (valRaw === 'true') parsedVal = true;
        else if (valRaw === 'false') parsedVal = false;
        else if (!isNaN(Number(valRaw)) && valRaw !== '') parsedVal = Number(valRaw);
        else if ((valRaw.startsWith('"') && valRaw.endsWith('"')) || (valRaw.startsWith("'") && valRaw.endsWith("'"))) {
          parsedVal = valRaw.slice(1, -1);
        }

        if (currentSubTable) {
          subTableMap[currentSubTable][key] = parsedVal;
        } else {
          result[key] = parsedVal;
        }
      }
    }

    return result;
  } catch (error) {
    console.error('Failed to read SandboxVars.lua:', error);
    return {};
  }
}

export async function saveSandboxVars(updatedVars: SandboxVarsData): Promise<{ success: boolean; error?: string }> {
  try {
    const existing = await readSandboxVars();
    const merged = { ...existing, ...updatedVars };

    // Strict sanitization helper to prevent Lua injection
    const sanitizeLuaValue = (val: string | number | boolean): string => {
      if (typeof val === 'boolean') return val ? 'true' : 'false';
      if (typeof val === 'number') {
        if (isNaN(val)) return '1';
        return String(val);
      }
      const sanitizedStr = String(val).replace(/["\\\r\n]/g, '');
      return `"${sanitizedStr}"`;
    };

    // Serialize Lua SandboxVars
    let lua = 'SandboxVars = {\n';
    lua += '    VERSION = 6,\n';

    for (const [key, val] of Object.entries(merged)) {
      if (key === 'VERSION') continue;

      if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
        lua += `    ${key} = {\n`;
        for (const [subKey, subVal] of Object.entries(val as Record<string, string | number | boolean>)) {
          lua += `        ${subKey} = ${sanitizeLuaValue(subVal)},\n`;
        }
        lua += '    },\n';
      } else {
        lua += `    ${key} = ${sanitizeLuaValue(val as string | number | boolean)},\n`;
      }
    }

    lua += '}\n';

    // Atomic file write using temporary file
    const tmpPath = `${SANDBOX_LUA_PATH}.tmp.${Date.now()}`;
    await fs.writeFile(tmpPath, lua, 'utf-8');
    await fs.rename(tmpPath, SANDBOX_LUA_PATH);

    return { success: true };
  } catch (error) {
    console.error('Failed to write SandboxVars.lua:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}
