import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs/promises';
import { readIniFile, saveIniFile, readServerProperties, saveServerProperties, getServerUptime, executeServerAction } from '@/lib/serverUtils';
import { CORE_MAP_NAME } from '@/constants/game';
import { invalidateCache } from '@/lib/cache';
import { CONFIG } from '@/lib/config';

const mockCustomPromisify = vi.fn();

vi.mock('child_process', () => {
  const execFileMock = vi.fn();
  Object.assign(execFileMock, {
    [Symbol.for('nodejs.util.promisify.custom')]: (...args: unknown[]) => mockCustomPromisify(...args),
  });
  return { execFile: execFileMock };
});

vi.mock('fs/promises');

describe('serverUtils - INI Handling & Server Helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateCache();
  });

  describe('readIniFile', () => {
    it('should parse WorkshopItems, Mods, and ensure CORE_MAP_NAME is last in Map', async () => {
      const mockIni = `
# Project Zomboid Server Settings
WorkshopItems=123456;789012
Mods=ModA;ModB;ModC
Map=RavenCreek;Muldraugh, KY;BedfordFalls
PVP=true
`;
      vi.mocked(fs.readFile).mockResolvedValue(mockIni);

      const result = await readIniFile();

      expect(result.workshopItems).toEqual(['123456', '789012']);
      expect(result.mods).toEqual(['ModA', 'ModB', 'ModC']);
      // CORE_MAP_NAME (Muldraugh, KY) must be strictly last
      expect(result.maps).toEqual(['RavenCreek', 'BedfordFalls', CORE_MAP_NAME]);
      expect(result.maps[result.maps.length - 1]).toBe(CORE_MAP_NAME);
    });

    it('should handle missing or empty INI gracefully', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'));

      const result = await readIniFile();
      expect(result.workshopItems).toEqual([]);
      expect(result.mods).toEqual([]);
      expect(result.maps).toEqual([CORE_MAP_NAME]);
    });
  });

  describe('saveIniFile', () => {
    it('should update WorkshopItems, Mods, Map and write atomically', async () => {
      const initialIni = `
# Existing config
WorkshopItems=old_item
Mods=old_mod
Map=Muldraugh, KY
Public=true
`;
      vi.mocked(fs.readFile).mockResolvedValue(initialIni);
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      vi.mocked(fs.rename).mockResolvedValue(undefined);

      const success = await saveIniFile(['111', '222'], ['Mod1', 'Mod2'], ['CustomMap', CORE_MAP_NAME]);
      expect(success).toBe(true);

      expect(fs.writeFile).toHaveBeenCalledTimes(1);
      const writtenContent = vi.mocked(fs.writeFile).mock.calls[0][1] as string;

      expect(writtenContent).toContain('WorkshopItems=111;222');
      expect(writtenContent).toContain('Mods=Mod1;Mod2');
      expect(writtenContent).toContain(`Map=CustomMap;${CORE_MAP_NAME}`);
      expect(writtenContent).toContain('Public=true');
      expect(writtenContent).toContain('# Existing config');
    });
  });

  describe('readServerProperties & saveServerProperties', () => {
    it('should read all key-value properties correctly', async () => {
      const mockIni = `
# Comment
MaxPlayers=16
PingLimit=400
PublicName=My PZ Server
`;
      vi.mocked(fs.readFile).mockResolvedValue(mockIni);

      const props = await readServerProperties();
      expect(props.MaxPlayers).toBe('16');
      expect(props.PingLimit).toBe('400');
      expect(props.PublicName).toBe('My PZ Server');
    });

    it('should save boolean and string properties without corrupting file', async () => {
      const mockIni = 'MaxPlayers=16\nPVP=true\n';
      vi.mocked(fs.readFile).mockResolvedValue(mockIni);
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      vi.mocked(fs.rename).mockResolvedValue(undefined);

      const result = await saveServerProperties({
        MaxPlayers: 32,
        PVP: false,
        NewSetting: 'Enabled',
      });

      expect(result.success).toBe(true);
      const writtenContent = vi.mocked(fs.writeFile).mock.calls[0][1] as string;
      expect(writtenContent).toContain('MaxPlayers=32');
      expect(writtenContent).toContain('PVP=false');
      expect(writtenContent).toContain('NewSetting=Enabled');
    });
  });

  describe('getServerUptime', () => {
    it('should calculate and format uptime correctly', async () => {
      const pastTime = new Date(Date.now() - 3600 * 1000 * 2.5).toISOString(); // 2h 30m ago
      mockCustomPromisify.mockResolvedValue({ stdout: pastTime, stderr: '' });

      const uptime = await getServerUptime();
      expect(uptime).toContain('2h 30m');
    });
  });

  describe('executeServerAction', () => {
    it('should run docker start when container exists', async () => {
      mockCustomPromisify.mockImplementation((cmd, args) => {
        if (args[0] === 'inspect') return Promise.resolve({ stdout: '{}', stderr: '' });
        if (args[0] === 'start') return Promise.resolve({ stdout: 'pz-server', stderr: '' });
        return Promise.resolve({ stdout: '', stderr: '' });
      });

      const result = await executeServerAction('start');
      expect(result.success).toBe(true);
      expect(mockCustomPromisify).toHaveBeenCalledWith('docker', ['inspect', CONFIG.containerName]);
      expect(mockCustomPromisify).toHaveBeenCalledWith('docker', ['start', CONFIG.containerName]);
    });

    it('should fallback to docker compose up -d when container does not exist but compose file is found', async () => {
      mockCustomPromisify.mockImplementation((cmd, args) => {
        if (args[0] === 'inspect') return Promise.reject(new Error('No such container'));
        if (args[0] === 'compose') return Promise.resolve({ stdout: 'Started', stderr: '' });
        return Promise.resolve({ stdout: '', stderr: '' });
      });

      vi.mocked(fs.stat).mockResolvedValue({} as never);

      const result = await executeServerAction('start');
      expect(result.success).toBe(true);
      expect(mockCustomPromisify).toHaveBeenCalledWith('docker', [
        'compose',
        '--project-directory',
        CONFIG.hostServerDir,
        '-f',
        expect.stringContaining('docker-compose.yml'),
        'up',
        '-d',
      ]);
    });

    it('should return error if container does not exist and no compose file is found', async () => {
      mockCustomPromisify.mockImplementation((cmd, args) => {
        if (args[0] === 'inspect') return Promise.reject(new Error('No such container'));
        return Promise.resolve({ stdout: '', stderr: '' });
      });

      vi.mocked(fs.stat).mockRejectedValue(new Error('ENOENT'));

      const result = await executeServerAction('start');
      expect(result.success).toBe(false);
      expect(result.error).toContain('does not exist and no docker-compose file was found');
    });

    it('should gracefully handle stop when container is not present', async () => {
      mockCustomPromisify.mockImplementation((cmd, args) => {
        if (args[0] === 'inspect') return Promise.reject(new Error('No such container'));
        return Promise.resolve({ stdout: '', stderr: '' });
      });

      const result = await executeServerAction('stop');
      expect(result.success).toBe(true);
      expect(result.message).toContain('already stopped');
    });

    it('should run docker restart when container is present', async () => {
      mockCustomPromisify.mockImplementation((cmd, args) => {
        if (args[0] === 'inspect') return Promise.resolve({ stdout: '{}', stderr: '' });
        if (args[0] === 'restart') return Promise.resolve({ stdout: 'pz-server', stderr: '' });
        return Promise.resolve({ stdout: '', stderr: '' });
      });

      const result = await executeServerAction('restart');
      expect(result.success).toBe(true);
      expect(mockCustomPromisify).toHaveBeenCalledWith('docker', ['restart', CONFIG.containerName]);
    });
  });
});
