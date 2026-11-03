import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs/promises';
import { readSpawnRegions, saveSpawnRegions } from '@/lib/spawnRegionUtils';
import { OFFICIAL_SPAWN_REGIONS } from '@/constants/serverProperties';

vi.mock('fs/promises');

describe('spawnRegionUtils - Lua Spawn Regions Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should define all 11 official vanilla Kentucky spawn regions (B41 + B42)', () => {
    expect(OFFICIAL_SPAWN_REGIONS).toHaveLength(11);
    const names = OFFICIAL_SPAWN_REGIONS.map((r) => r.name);
    expect(names).toEqual([
      'Muldraugh, KY',
      'West Point, KY',
      'Rosewood, KY',
      'Riverside, KY',
      'Echo Creek, KY',
      'Ekron, KY',
      'Fallas Lake, KY',
      'Irvington, KY',
      'Brandenburg, KY',
      'March Ridge, KY',
      'Valley Station, KY',
    ]);
  });

  it('should parse custom, official (B41/B42), and serverfile spawn regions from lua file', async () => {
    const luaContent = `
function SpawnRegions()
    return {
        { name = "Muldraugh, KY", file = "media/maps/Muldraugh, KY/spawnpoints.lua" },
        { name = "Echo Creek, KY", file = "media/maps/Echo Creek, KY/spawnpoints.lua" },
        { name = "Raven Creek", file = "media/maps/Raven Creek/spawnpoints.lua" },
        { name = "Louisville, KY", serverfile = "servertest_louisville_spawnpoints.lua" },
    }
end
`;
    vi.mocked(fs.readFile).mockResolvedValue(luaContent);

    const regions = await readSpawnRegions();
    expect(regions).toHaveLength(4);
    expect(regions[0]).toEqual({
      name: 'Muldraugh, KY',
      file: 'media/maps/Muldraugh, KY/spawnpoints.lua',
      isOfficial: true,
    });
    expect(regions[1]).toEqual({
      name: 'Echo Creek, KY',
      file: 'media/maps/Echo Creek, KY/spawnpoints.lua',
      isOfficial: true,
    });
    expect(regions[2]).toEqual({
      name: 'Raven Creek',
      file: 'media/maps/Raven Creek/spawnpoints.lua',
      isOfficial: false,
    });
    expect(regions[3]).toEqual({
      name: 'Louisville, KY',
      serverfile: 'servertest_louisville_spawnpoints.lua',
      isOfficial: false,
    });
  });

  it('should fallback to OFFICIAL_SPAWN_REGIONS if file does not exist', async () => {
    vi.mocked(fs.readFile).mockRejectedValue(new Error('ENOENT'));

    const regions = await readSpawnRegions();
    expect(regions).toEqual(OFFICIAL_SPAWN_REGIONS);
  });

  it('should serialize both file and serverfile spawn regions to valid Lua format with escaping', async () => {
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);
    vi.mocked(fs.rename).mockResolvedValue(undefined);

    const input = [
      { name: 'Muldraugh, KY', file: 'media/maps/Muldraugh, KY/spawnpoints.lua', isOfficial: true },
      { name: 'Echo Creek, KY', file: 'media/maps/Echo Creek, KY/spawnpoints.lua', isOfficial: true },
      { name: 'Custom "Town"', file: 'media/maps/Custom Town/spawnpoints.lua', isOfficial: false },
      { name: 'Louisville, KY', serverfile: 'servertest_louisville_spawnpoints.lua', isOfficial: false },
    ];

    const result = await saveSpawnRegions(input);
    expect(result.success).toBe(true);
    expect(fs.writeFile).toHaveBeenCalledTimes(1);

    const writtenLua = vi.mocked(fs.writeFile).mock.calls[0][1] as string;
    expect(writtenLua).toContain('function SpawnRegions()');
    expect(writtenLua).toContain('{ name = "Muldraugh, KY", file = "media/maps/Muldraugh, KY/spawnpoints.lua" }');
    expect(writtenLua).toContain('{ name = "Echo Creek, KY", file = "media/maps/Echo Creek, KY/spawnpoints.lua" }');
    expect(writtenLua).toContain('{ name = "Custom \\"Town\\"", file = "media/maps/Custom Town/spawnpoints.lua" }');
    expect(writtenLua).toContain('{ name = "Louisville, KY", serverfile = "servertest_louisville_spawnpoints.lua" }');
    expect(writtenLua).toContain('end');
  });
});
