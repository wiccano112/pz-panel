import { describe, it, expect } from 'vitest';
import { CONFIG } from '@/lib/config';

describe('config - Parameterization & Fallback Integrity', () => {
  it('should provide default safe fallbacks without exposing host sensitive paths', () => {
    expect(CONFIG.serverName).toBeDefined();
    expect(CONFIG.containerName).toBeDefined();
    expect(CONFIG.iniPath).toContain(`${CONFIG.serverName}.ini`);
    expect(CONFIG.sandboxPath).toContain(`${CONFIG.serverName}_SandboxVars.lua`);
    expect(CONFIG.dbPath).toContain(`${CONFIG.serverName}.db`);
    expect(CONFIG.spawnregionsPath).toContain(`${CONFIG.serverName}_spawnregions.lua`);
  });

  it('should not contain hardcoded credentials in defaults', () => {
    expect(CONFIG.steamApiKey).toBe(process.env.STEAM_API_KEY || '');
  });
});
