import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, it, expect } from 'vitest';
import { CONFIG, readHardwareConfig, isExplicitCpuRange } from '@/lib/config';

describe('config - Parameterization & Fallback Integrity', () => {
  it('should provide default safe fallbacks without exposing host sensitive paths', () => {
    expect(CONFIG.serverName).toBeDefined();
    expect(CONFIG.containerName).toBeDefined();
    expect(CONFIG.serverCpus).toBeDefined();
    expect(CONFIG.otherCpus).toBeDefined();
    expect(CONFIG.hardwareConfigPath).toContain('hardware.json');
    expect(CONFIG.iniPath).toContain(`${CONFIG.serverName}.ini`);
    expect(CONFIG.sandboxPath).toContain(`${CONFIG.serverName}_SandboxVars.lua`);
    expect(CONFIG.dbPath).toContain(`${CONFIG.serverName}.db`);
    expect(CONFIG.spawnregionsPath).toContain(`${CONFIG.serverName}_spawnregions.lua`);
    expect(CONFIG.consoleLogPath).toContain('server-console.txt');
    expect(CONFIG.logsDir).toContain('Logs');
  });

  it('should distinguish explicit CPU ranges from auto or empty values', () => {
    expect(isExplicitCpuRange('3-5')).toBe(true);
    expect(isExplicitCpuRange('0,2,4')).toBe(true);
    expect(isExplicitCpuRange('auto')).toBe(false);
    expect(isExplicitCpuRange('AUTO')).toBe(false);
    expect(isExplicitCpuRange('')).toBe(false);
    expect(isExplicitCpuRange(undefined)).toBe(false);
  });

  it('should parse valid hardware config JSON file and reject malformed files', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pz-panel-hw-'));
    const validPath = path.join(tmpDir, 'hardware.json');
    const invalidRangePath = path.join(tmpDir, 'invalid-range.json');
    const brokenJsonPath = path.join(tmpDir, 'broken.json');

    try {
      fs.writeFileSync(
        validPath,
        JSON.stringify({
          serverCpus: '3-5',
          otherCpus: '0-2',
          serverLabel: 'PZ Server',
          otherLabel: 'Host System',
        })
      );
      expect(readHardwareConfig(validPath)).toEqual({
        serverCpus: '3-5',
        otherCpus: '0-2',
        serverLabel: 'PZ Server',
        otherLabel: 'Host System',
      });

      fs.writeFileSync(
        invalidRangePath,
        JSON.stringify({
          serverCpus: '3-5; rm -rf /',
        })
      );
      expect(readHardwareConfig(invalidRangePath)).toBeNull();

      fs.writeFileSync(brokenJsonPath, '{not valid json');
      expect(readHardwareConfig(brokenJsonPath)).toBeNull();

      expect(readHardwareConfig(path.join(tmpDir, 'missing.json'))).toBeNull();
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('should prioritize hardware config file over env vars for serverCpus and otherCpus', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pz-panel-cfg-'));
    const cfgPath = path.join(tmpDir, 'hardware.json');
    const originalConfigPath = process.env.PZ_HARDWARE_CONFIG_PATH;
    const originalServerCpus = process.env.PZ_SERVER_CPUS;
    const originalOtherCpus = process.env.PZ_OTHER_CPUS;

    try {
      fs.writeFileSync(
        cfgPath,
        JSON.stringify({ serverCpus: '3-5', otherCpus: '0-2' })
      );
      process.env.PZ_HARDWARE_CONFIG_PATH = cfgPath;
      process.env.PZ_SERVER_CPUS = '0-1';
      process.env.PZ_OTHER_CPUS = '2-5';

      expect(CONFIG.serverCpus).toBe('3-5');
      expect(CONFIG.otherCpus).toBe('0-2');

      // When config file uses "auto", falls back to env vars
      fs.writeFileSync(
        cfgPath,
        JSON.stringify({ serverCpus: 'auto', otherCpus: 'auto' })
      );
      expect(CONFIG.serverCpus).toBe('0-1');
      expect(CONFIG.otherCpus).toBe('2-5');
    } finally {
      if (originalConfigPath !== undefined) process.env.PZ_HARDWARE_CONFIG_PATH = originalConfigPath;
      else delete process.env.PZ_HARDWARE_CONFIG_PATH;

      if (originalServerCpus !== undefined) process.env.PZ_SERVER_CPUS = originalServerCpus;
      else delete process.env.PZ_SERVER_CPUS;

      if (originalOtherCpus !== undefined) process.env.PZ_OTHER_CPUS = originalOtherCpus;
      else delete process.env.PZ_OTHER_CPUS;

      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('should not contain hardcoded credentials in defaults', () => {
    expect(CONFIG.steamApiKey).toBe(process.env.STEAM_API_KEY || '');
  });
});
