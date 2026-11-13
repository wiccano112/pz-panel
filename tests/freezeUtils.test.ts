import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  normalizeFreezeCatalog,
  buildFreezeCliArgs,
  freezeOperationSchema,
  getFreezeCatalog,
  executeFreezeOperation,
  slugifyPreview,
  sanitizeManifestText,
} from '@/lib/freezeUtils';
import { CONFIG } from '@/lib/config';

const mockCustomPromisify = vi.fn();

vi.mock('child_process', () => {
  const execFileMock = vi.fn();
  Object.assign(execFileMock, {
    [Symbol.for('nodejs.util.promisify.custom')]: (...args: unknown[]) => mockCustomPromisify(...args),
  });
  return { execFile: execFileMock };
});

describe('freezeUtils - World Freeze, Thaw & Rotation Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('slugifyPreview & sanitizeManifestText', () => {
    it('should generate clean slugs without accents or special characters', () => {
      expect(slugifyPreview('Temporada 1 - Eldén!')).toBe('temporada-1-elden');
      expect(slugifyPreview('  ---Server Test 2026---  ')).toBe('server-test-2026');
    });

    it('should strip newlines, control chars, shell metacharacters, and double quotes from manifest text', () => {
      expect(sanitizeManifestText('Season "Alpha"\nLine 2\r\tEnd')).toBe("Season 'Alpha' Line 2 End");
      expect(sanitizeManifestText('Test $(whoami) `id` $HOME \\path')).toBe('Test (whoami) id HOME path');
      expect(sanitizeManifestText(undefined)).toBe('');
    });
  });

  describe('normalizeFreezeCatalog (Rule 5 & Rule 9 Compliance)', () => {
    it('should sanitize host paths from restoredFrom and translate Spanish defaults to English', () => {
      const rawJson = {
        active: {
          hasActiveWorld: true,
          instanceName: 'Nuevo Mundo (2026-11-13 19:00)',
          instanceSlug: 'fresh-20261113',
          restoredFrom: '/opt/pz-server/frozen/temporada-1-elden',
          startedAt: '2026-11-13 19:00:00',
          serverName: 'NobaraZomboid',
          serverBranch: 'stable',
        },
        frozenServers: [
          {
            slug: 'temporada-1-elden',
            name: 'Temporada 1 - Elden',
            frozenAt: '2026-11-13 19:45:00',
            serverName: 'NobaraZomboid',
            serverBranch: 'stable',
            gameVersion: 'Desconocida',
            charactersCount: 14,
            accountsCount: 12,
            vehiclesCount: 185,
            modsCount: 42,
            uncompressedSize: '1.9G',
            archiveSize: '32M',
            archiveBytes: 33554432,
            notes: 'End of season 1',
          },
        ],
      };

      const normalized = normalizeFreezeCatalog(rawJson);

      expect(normalized.active.instanceName).toBe('Fresh World (2026-11-13 19:00)');
      expect(normalized.active.restoredFrom).toBe('temporada-1-elden');
      expect(normalized.frozenServers).toHaveLength(1);
      expect(normalized.frozenServers[0].gameVersion).toBe('Unknown');
      expect(normalized.frozenServers[0].charactersCount).toBe(14);
      expect(normalized.frozenServers[0].vehiclesCount).toBe(185);
    });

    it('should preserve fresh_start indicator in restoredFrom', () => {
      const normalized = normalizeFreezeCatalog({
        active: {
          hasActiveWorld: true,
          instanceName: 'My World',
          restoredFrom: 'fresh_start',
        },
        frozenServers: [],
      });
      expect(normalized.active.restoredFrom).toBe('fresh_start');
    });
  });

  describe('freezeOperationSchema & buildFreezeCliArgs', () => {
    it('should reject names or notes starting with a hyphen to prevent CLI flag injection', () => {
      expect(
        freezeOperationSchema.safeParse({
          mode: 'freeze-only',
          name: '--no-start',
        }).success
      ).toBe(false);

      expect(
        freezeOperationSchema.safeParse({
          mode: 'freeze-and-new',
          name: 'Valid Name',
          notes: '-y',
        }).success
      ).toBe(false);
    });

    it('should reject path traversal attempts in target slug', () => {
      expect(
        freezeOperationSchema.safeParse({
          mode: 'unfreeze',
          target: '../etc/passwd',
        }).success
      ).toBe(false);

      expect(
        freezeOperationSchema.safeParse({
          mode: 'delete',
          target: 'slug/with/slash',
        }).success
      ).toBe(false);
    });

    it('should build deterministic CLI arguments for all 5 modes', () => {
      const mode1 = freezeOperationSchema.parse({
        mode: 'freeze-and-new',
        name: 'Season 1',
        notes: 'Final snapshot',
      });
      expect(buildFreezeCliArgs(mode1)).toEqual([
        '--freeze-and-new',
        '--name',
        'Season 1',
        '--notes',
        'Final snapshot',
        '-y',
      ]);

      const mode2 = freezeOperationSchema.parse({
        mode: 'swap',
        name: 'Current Run',
        notes: '',
        target: 'season-1',
      });
      expect(buildFreezeCliArgs(mode2)).toEqual([
        '--swap',
        '--name',
        'Current Run',
        '--target',
        'season-1',
        '-y',
      ]);

      const mode3 = freezeOperationSchema.parse({
        mode: 'freeze-only',
        name: 'Cold Backup',
      });
      expect(buildFreezeCliArgs(mode3)).toEqual([
        '--freeze-only',
        '--name',
        'Cold Backup',
        '-y',
      ]);

      const mode4 = freezeOperationSchema.parse({
        mode: 'unfreeze',
        target: 'season-1',
      });
      expect(buildFreezeCliArgs(mode4)).toEqual(['--unfreeze', '--target', 'season-1', '-y']);

      const mode5 = freezeOperationSchema.parse({
        mode: 'delete',
        target: 'season-1',
      });
      expect(buildFreezeCliArgs(mode5)).toEqual(['--delete', '--target', 'season-1', '-y']);
    });
  });

  describe('getFreezeCatalog & executeFreezeOperation', () => {
    it('should invoke freeze_manager.sh --list --json with container & host path environment', async () => {
      mockCustomPromisify.mockResolvedValueOnce({
        stdout: JSON.stringify({
          active: {
            hasActiveWorld: true,
            instanceName: 'NobaraZomboid',
            instanceSlug: null,
            restoredFrom: null,
            startedAt: null,
            serverName: 'NobaraZomboid',
            serverBranch: 'stable',
          },
          frozenServers: [],
        }),
        stderr: '',
      });

      const catalog = await getFreezeCatalog();
      expect(catalog.active.hasActiveWorld).toBe(true);
      expect(catalog.active.instanceName).toBe('NobaraZomboid');
      expect(mockCustomPromisify).toHaveBeenCalledWith(
        CONFIG.freezeScriptPath,
        ['--list', '--json'],
        expect.objectContaining({
          cwd: CONFIG.serverDir,
          env: expect.objectContaining({
            DATA_PATH: expect.stringContaining('data'),
            FROZEN_DIR: expect.stringContaining('frozen'),
            HOST_DATA_PATH: expect.stringContaining('data'),
          }),
        })
      );
    });

    it('should execute valid freeze operation and return success message', async () => {
      mockCustomPromisify.mockResolvedValueOnce({ stdout: '[OK] Done', stderr: '' });

      const result = await executeFreezeOperation({
        mode: 'swap',
        name: 'Season 2',
        notes: 'Swapping back to Season 1',
        target: 'season-1',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Season 2');
      expect(result.message).toContain('season-1');
      expect(mockCustomPromisify).toHaveBeenCalledWith(
        CONFIG.freezeScriptPath,
        ['--swap', '--name', 'Season 2', '--notes', 'Swapping back to Season 1', '--target', 'season-1', '-y'],
        expect.objectContaining({
          timeout: 300_000,
        })
      );
    });

    it('should strip ANSI codes and mask host user paths on script error', async () => {
      mockCustomPromisify.mockRejectedValueOnce({
        stderr: '\x1b[0;31m[ERROR]\x1b[0m Failed at /home/testuser/pz-server/frozen',
      });

      const result = await executeFreezeOperation({
        mode: 'delete',
        target: 'missing-world',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('[ERROR] Failed at /opt/pz-server/frozen');
      expect(result.message).not.toContain('/home/testuser');
    });
  });
});
