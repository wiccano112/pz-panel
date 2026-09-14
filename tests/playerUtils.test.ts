import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import { getPlayerConnectionHistory } from '@/lib/playerUtils';
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

    it('should parse connection and disconnection events from user.txt and connections.txt', async () => {
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

      expect(history[1].type).toBe('CONNECTED');
      expect(history[1].username).toBe('SurvivorBob');
      expect(history[1].steamid).toBe('76561198000000001');
      expect(history[1].ip).toBe('192.168.1.50');
      expect(history[1].coordinates).toBe('8117, 12232, 0');
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
