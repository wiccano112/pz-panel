import { describe, it, expect } from 'vitest';
import { CONFIG } from '@/lib/config';

describe('config - Parameterization & Fallback Integrity', () => {
  it('should provide default safe fallbacks without exposing host sensitive paths', () => {
    expect(CONFIG.serverName).toBeDefined();
    expect(CONFIG.containerName).toBeDefined();
    expect(CONFIG.serverCpus).toBeDefined();
    expect(CONFIG.iniPath).toContain(`${CONFIG.serverName}.ini`);
    expect(CONFIG.sandboxPath).toContain(`${CONFIG.serverName}_SandboxVars.lua`);
    expect(CONFIG.dbPath).toContain(`${CONFIG.serverName}.db`);
    expect(CONFIG.spawnregionsPath).toContain(`${CONFIG.serverName}_spawnregions.lua`);
  });

  it('should resolve serverCpus with fallback or environment variable', () => {
    const originalEnv = process.env.PZ_SERVER_CPUS;
    try {
      delete process.env.PZ_SERVER_CPUS;
      expect(typeof CONFIG.serverCpus).toBe('string');
      expect(CONFIG.serverCpus.length).toBeGreaterThan(0);

      process.env.PZ_SERVER_CPUS = '0-5';
      expect(CONFIG.serverCpus).toBe('0-5');
    } finally {
      if (originalEnv !== undefined) {
        process.env.PZ_SERVER_CPUS = originalEnv;
      } else {
        delete process.env.PZ_SERVER_CPUS;
      }
    }
  });

  it('should not contain hardcoded credentials in defaults', () => {
    expect(CONFIG.steamApiKey).toBe(process.env.STEAM_API_KEY || '');
  });
});
