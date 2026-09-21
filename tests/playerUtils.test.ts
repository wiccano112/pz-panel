import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import {
  getPlayerConnectionHistory,
  parsePzLogTimestampToUtc,
  formatToClt,
  collectLogFiles,
} from '@/lib/playerUtils';
import { invalidateCache } from '@/lib/cache';

vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  return {
    ...actual,
    default: {
      ...actual,
      existsSync: vi.fn(),
      promises: {
        readdir: vi.fn(),
        readFile: vi.fn(),
      },
    },
    existsSync: vi.fn(),
    promises: {
      readdir: vi.fn(),
      readFile: vi.fn(),
    },
  };
});

describe('playerUtils - Timestamp & Date Formatting (CLT)', () => {
  describe('parsePzLogTimestampToUtc', () => {
    it('should parse DD-MM-YY HH:mm:ss.SSS into UTC Date', () => {
      const parsed = parsePzLogTimestampToUtc('21-09-26 16:35:28.546');
      expect(parsed).not.toBeNull();
      expect(parsed?.toISOString()).toBe('2026-09-21T16:35:28.546Z');
    });

    it('should parse DD-MM-YY HH:mm:ss without milliseconds', () => {
      const parsed = parsePzLogTimestampToUtc('02-09-26 04:29:21');
      expect(parsed).not.toBeNull();
      expect(parsed?.toISOString()).toBe('2026-09-02T04:29:21.000Z');
    });

    it('should return null for invalid or empty timestamps', () => {
      expect(parsePzLogTimestampToUtc('')).toBeNull();
      expect(parsePzLogTimestampToUtc('invalid-timestamp')).toBeNull();
      expect(parsePzLogTimestampToUtc(null as unknown as string)).toBeNull();
    });
  });

  describe('formatToClt', () => {
    it('should format UTC timestamp string to America/Santiago CLT', () => {
      // 2026-09-21 16:35:28 UTC in America/Santiago (UTC-3 in September) is 13:35:28
      const clt = formatToClt('21-09-26 16:35:28.546');
      expect(clt).toContain('CLT');
      expect(clt).toBe('2026-09-21 13:35:28 CLT');
    });

    it('should format standard time (winter UTC-4) correctly', () => {
      // 2026-08-31 00:00:12 UTC in America/Santiago (UTC-4 in August) is 2026-08-30 20:00:12
      const clt = formatToClt('31-08-26 00:00:12.769');
      expect(clt).toBe('2026-08-30 20:00:12 CLT');
    });

    it('should gracefully return original string if date cannot be parsed', () => {
      expect(formatToClt('raw-text')).toBe('raw-text');
      expect(formatToClt('')).toBe('');
    });
  });
});

describe('playerUtils - Log Collector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should recursively collect user and connection files from subdirectories', async () => {
    vi.mocked(fs.promises.readdir).mockImplementation((dirPath: unknown) => {
      const p = String(dirPath);
      if (p.endsWith('Logs')) {
        return Promise.resolve([
          '2026-09-21_14-34_user.txt',
          '2026-09-21_14-34_connections.txt',
          'logs_2026-09-20',
          'other_file.log',
        ] as never);
      }
      if (p.endsWith('logs_2026-09-20')) {
        return Promise.resolve([
          '2026-09-20_08-00_user.txt',
          '2026-09-20_08-00_connections.txt',
        ] as never);
      }
      return Promise.resolve([] as never);
    });

    const { userFiles, connFiles } = await collectLogFiles('/pz-server/data/Logs');
    expect(userFiles.length).toBe(2);
    expect(connFiles.length).toBe(2);

    // Sorted newest first by name
    expect(userFiles[0].name).toBe('2026-09-21_14-34_user.txt');
    expect(userFiles[1].name).toBe('2026-09-20_08-00_user.txt');
    expect(connFiles[0].name).toBe('2026-09-21_14-34_connections.txt');
    expect(connFiles[1].name).toBe('2026-09-20_08-00_connections.txt');
  });
});

describe('playerUtils - Connection History & Logs Parser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateCache();
  });

  describe('getPlayerConnectionHistory', () => {
    it('should return empty list if logs directory does not exist', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const history = await getPlayerConnectionHistory();
      expect(history).toEqual([]);
    });

    it('should parse connection and disconnection events with CLT timestamp and IP resolution', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readdir).mockResolvedValue([
        '2026-09-02_04-29-21_user.txt',
        '2026-09-02_04-29-21_connections.txt',
      ] as never);

      const mockConnections = `
[02-09-26 04:29:21.534] connection accepted from ip="192.168.1.50" username="SurvivorBob" steam-id="76561198000000001"
`;

      const mockUserLog = `
[02-09-26 04:29:21.534] 76561198000000001 "SurvivorBob" fully connected (8117,12232,0).
[02-09-26 05:37:06.416] 76561198000000001 "SurvivorBob" disconnected player "SurvivorBob" (8117,12232,0).
`;

      vi.mocked(fs.promises.readFile).mockImplementation((filePath: unknown) => {
        const pathStr = String(filePath);
        if (pathStr.endsWith('_connections.txt')) return Promise.resolve(mockConnections);
        if (pathStr.endsWith('_user.txt')) return Promise.resolve(mockUserLog);
        return Promise.resolve('');
      });

      const history = await getPlayerConnectionHistory();
      expect(history.length).toBe(2);

      // Newest event first (since lines are parsed reverse)
      expect(history[0].type).toBe('DISCONNECTED');
      expect(history[0].username).toBe('SurvivorBob');
      expect(history[0].steamid).toBe('76561198000000001');
      expect(history[0].ip).toBe('192.168.1.50');
      expect(history[0].coordinates).toBe('8117, 12232, 0');
      expect(history[0].timestamp).toContain('CLT');
      expect(history[0].rawTimestamp).toBe('02-09-26 05:37:06.416');

      expect(history[1].type).toBe('CONNECTED');
      expect(history[1].username).toBe('SurvivorBob');
      expect(history[1].steamid).toBe('76561198000000001');
      expect(history[1].ip).toBe('192.168.1.50');
      expect(history[1].coordinates).toBe('8117, 12232, 0');
      expect(history[1].timestamp).toContain('CLT');
      expect(history[1].rawTimestamp).toBe('02-09-26 04:29:21.534');
    });

    it('should respect the limit parameter', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readdir).mockResolvedValue(['log_user.txt'] as never);

      const mockUserLog = `
[01-01-26 10:00:00.000] 111 "Player1" fully connected (1,2,3).
[01-01-26 11:00:00.000] 222 "Player2" fully connected (4,5,6).
[01-01-26 12:00:00.000] 333 "Player3" fully connected (7,8,9).
`;
      vi.mocked(fs.promises.readFile).mockResolvedValue(mockUserLog);

      const history = await getPlayerConnectionHistory(2);
      expect(history.length).toBe(2);
      expect(history[0].username).toBe('Player3');
      expect(history[1].username).toBe('Player2');
    });
  });
});
