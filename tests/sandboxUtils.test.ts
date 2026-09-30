import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs/promises';
import {
  parseLuaTable,
  readSandboxVars,
  saveSandboxVars,
  sandboxVarsSchema,
  sanitizeLuaString,
  formatLuaKey,
} from '@/lib/sandboxUtils';
import { CONFIG } from '@/lib/config';
import { SANDBOX_CATEGORIES } from '@/constants/sandbox';

vi.mock('fs/promises');

describe('sandboxUtils - Lua Table Parser & File Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should parse simple key-value pairs', () => {
    const lua = `
      SandboxVars = {
          VERSION = 6,
          Zombies = 3,
          PVP = false,
          ServerWelcomeMessage = "Welcome to Zomboid!",
      }
    `;
    const result = parseLuaTable(lua) as Record<string, unknown>;
    expect(result.VERSION).toBe(6);
    expect(result.Zombies).toBe(3);
    expect(result.PVP).toBe(false);
    expect(result.ServerWelcomeMessage).toBe('Welcome to Zomboid!');
  });

  it('should parse nested tables and dictionaries', () => {
    const lua = `
      SandboxVars = {
          ZombieLore = {
              Speed = 2,
              Strength = 1,
              Toughness = 2,
              Transmission = 1,
          },
          Multiplier = 1.5,
          NegativeVal = -10,
      }
    `;
    const result = parseLuaTable(lua) as Record<string, unknown>;
    expect(result.Multiplier).toBe(1.5);
    expect(result.NegativeVal).toBe(-10);
    expect(result.ZombieLore).toEqual({
      Speed: 2,
      Strength: 1,
      Toughness: 2,
      Transmission: 1,
    });
  });

  it('should ignore single line and multiline comments', () => {
    const lua = `
      -- Single line comment at top
      SandboxVars = {
          -- Comment inside table
          Zombies = 1, -- Inline comment
          --[[
            Multiline comment
            with multiple lines
          ]]
          Loot = 2,
      }
    `;
    const result = parseLuaTable(lua) as Record<string, unknown>;
    expect(result.Zombies).toBe(1);
    expect(result.Loot).toBe(2);
  });

  it('should handle bracketed keys and escaped quotes in strings', () => {
    const lua = `
      SandboxVars = {
          ["CustomKey.WithDots"] = "Hello \\"World\\"",
          ["Mod_Setting_1"] = 100,
          MultilineStr = [[Line1
Line2]],
      }
    `;
    const result = parseLuaTable(lua) as Record<string, unknown>;
    expect(result['CustomKey.WithDots']).toBe('Hello "World"');
    expect(result['Mod_Setting_1']).toBe(100);
    expect(result['MultilineStr']).toBe('Line1\nLine2');
  });

  it('should handle arrays/positional elements inside tables', () => {
    const lua = `
      return {
          { name = "Muldraugh, KY", file = "media/maps/Muldraugh, KY/spawnpoints.lua" },
          { name = "West Point, KY", file = "media/maps/West Point, KY/spawnpoints.lua" },
      }
    `;
    const result = parseLuaTable(lua);
    expect(Array.isArray(result)).toBe(true);
    const arr = result as unknown as Array<{ name: string; file: string }>;
    expect(arr).toHaveLength(2);
    expect(arr[0].name).toBe('Muldraugh, KY');
    expect(arr[1].name).toBe('West Point, KY');
  });

  it('should return empty object for empty or invalid table', () => {
    expect(parseLuaTable('')).toEqual({});
    expect(parseLuaTable('   ')).toEqual({});
  });

  describe('readSandboxVars & saveSandboxVars (SEC-01)', () => {
    it('should read sandbox variables from file', async () => {
      const mockLua = `
SandboxVars = {
    VERSION = 6,
    Zombies = 2,
}
`;
      vi.mocked(fs.readFile).mockResolvedValue(mockLua);

      const vars = await readSandboxVars();
      expect(vars.VERSION).toBe(6);
      expect(vars.Zombies).toBe(2);
    });

    it('should save sandbox variables and create staging copy', async () => {
      vi.mocked(fs.readFile).mockResolvedValue('SandboxVars = { VERSION = 6, Zombies = 1 }');
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      vi.mocked(fs.rename).mockResolvedValue(undefined);

      const res = await saveSandboxVars({ Zombies: 4 });
      expect(res.success).toBe(true);

      // Writes atomic tmp file and staged copy (2 writes)
      expect(fs.writeFile).toHaveBeenCalledTimes(2);

      const writtenLua = vi.mocked(fs.writeFile).mock.calls[0][1] as string;
      const stagedPath = vi.mocked(fs.writeFile).mock.calls[1][0] as string;
      const stagedLua = vi.mocked(fs.writeFile).mock.calls[1][1] as string;

      expect(writtenLua).toContain('Zombies = 4');
      expect(stagedPath).toBe(`${CONFIG.sandboxPath}.staged`);
      expect(stagedLua).toBe(writtenLua);
    });
  });
});

describe('sandboxUtils - Zod Schema Validation & Lua Sanitization', () => {
  it('should accept valid sandbox variables and nested tables', () => {
    const validData = {
      VERSION: 6,
      Zombies: 4,
      PVP: true,
      ServerWelcomeMessage: 'Welcome to our server!',
      ZombieLore: {
        Speed: 2,
        Strength: 1,
        Toughness: 2,
      },
      'ModOption.Active': true,
    };

    const parseResult = sandboxVarsSchema.safeParse(validData);
    expect(parseResult.success).toBe(true);
  });

  it('should reject invalid keys with semicolons, quotes or shell/Lua injection characters', () => {
    const injectionKeys = [
      { 'Zombies"; os.execute("id"); --': 1 },
      { 'Key\nInjected': true },
      { 'Key\0Null': 123 },
      { '': 1 },
    ];

    for (const data of injectionKeys) {
      const result = sandboxVarsSchema.safeParse(data);
      expect(result.success).toBe(false);
    }
  });

  it('should reject non-finite numbers (NaN, Infinity)', () => {
    expect(sandboxVarsSchema.safeParse({ Speed: NaN }).success).toBe(false);
    expect(sandboxVarsSchema.safeParse({ Speed: Infinity }).success).toBe(false);
    expect(sandboxVarsSchema.safeParse({ Speed: -Infinity }).success).toBe(false);
  });

  it('should properly sanitize Lua strings against injection and escape sequences', () => {
    expect(sanitizeLuaString('Hello "World"')).toBe('Hello \\"World\\"');
    expect(sanitizeLuaString('Line1\nLine2\r')).toBe('Line1\\nLine2');
    expect(sanitizeLuaString('Backslash \\ test')).toBe('Backslash \\\\ test');
    expect(sanitizeLuaString('Null\0Byte')).toBe('NullByte');
  });

  it('should format Lua keys correctly and safely', () => {
    expect(formatLuaKey('Zombies')).toBe('Zombies');
    expect(formatLuaKey('Zombie_Lore_1')).toBe('Zombie_Lore_1');
    expect(formatLuaKey('Custom.Key')).toBe('["Custom.Key"]');
    expect(formatLuaKey('Mod-Setting')).toBe('["Mod-Setting"]');
    expect(formatLuaKey('Key"Quote')).toBe('["Key\\"Quote"]');
  });
});

describe('sandboxUtils - Generator & Fuel Station Build 42 Options', () => {
  it('should correctly define all 9 generator and fuel station fields in SANDBOX_CATEGORIES', () => {
    const advancedCat = SANDBOX_CATEGORIES.find((c) => c.id === 'advanced');
    expect(advancedCat).toBeDefined();

    const fieldsMap = new Map(advancedCat!.fields.map((f) => [f.key, f]));

    // 1. GeneratorVerticalPowerRange
    const vertRange = fieldsMap.get('GeneratorVerticalPowerRange');
    expect(vertRange).toBeDefined();
    expect(vertRange!.type).toBe('number');
    expect(vertRange!.defaultValue).toBe(3);
    expect(vertRange!.min).toBe(1);
    expect(vertRange!.max).toBe(15);
    expect(vertRange!.step).toBe(1);

    // 2. GeneratorFuelConsumption
    const fuelCons = fieldsMap.get('GeneratorFuelConsumption');
    expect(fuelCons).toBeDefined();
    expect(fuelCons!.type).toBe('number');
    expect(fuelCons!.defaultValue).toBe(0.1);
    expect(fuelCons!.min).toBe(0.0);
    expect(fuelCons!.max).toBe(100.0);
    expect(fuelCons!.step).toBe(0.01);

    // 3. GeneratorSpawning
    const genSpawn = fieldsMap.get('GeneratorSpawning');
    expect(genSpawn).toBeDefined();
    expect(genSpawn!.type).toBe('select');
    expect(genSpawn!.defaultValue).toBe(4);
    expect(genSpawn!.options).toHaveLength(7);
    expect(genSpawn!.options!.map((o) => o.value)).toEqual([1, 2, 3, 4, 5, 6, 7]);

    // 4. AllowExteriorGenerator
    const extGen = fieldsMap.get('AllowExteriorGenerator');
    expect(extGen).toBeDefined();
    expect(extGen!.type).toBe('boolean');
    expect(extGen!.defaultValue).toBe(true);

    // 5. GeneratorTileRange
    const tileRange = fieldsMap.get('GeneratorTileRange');
    expect(tileRange).toBeDefined();
    expect(tileRange!.type).toBe('number');
    expect(tileRange!.defaultValue).toBe(20);
    expect(tileRange!.min).toBe(1);
    expect(tileRange!.max).toBe(100);

    // 6. FuelStationGasInfinite
    const infinitePumps = fieldsMap.get('FuelStationGasInfinite');
    expect(infinitePumps).toBeDefined();
    expect(infinitePumps!.type).toBe('boolean');
    expect(infinitePumps!.defaultValue).toBe(false);

    // 7. FuelStationGasEmptyChance
    const emptyChance = fieldsMap.get('FuelStationGasEmptyChance');
    expect(emptyChance).toBeDefined();
    expect(emptyChance!.type).toBe('number');
    expect(emptyChance!.defaultValue).toBe(20);
    expect(emptyChance!.min).toBe(0);
    expect(emptyChance!.max).toBe(100);

    // 8. FuelStationGasMin
    const gasMin = fieldsMap.get('FuelStationGasMin');
    expect(gasMin).toBeDefined();
    expect(gasMin!.type).toBe('number');
    expect(gasMin!.defaultValue).toBe(0.0);
    expect(gasMin!.min).toBe(0.0);
    expect(gasMin!.max).toBe(1.0);
    expect(gasMin!.step).toBe(0.05);

    // 9. FuelStationGasMax
    const gasMax = fieldsMap.get('FuelStationGasMax');
    expect(gasMax).toBeDefined();
    expect(gasMax!.type).toBe('number');
    expect(gasMax!.defaultValue).toBe(0.8);
    expect(gasMax!.min).toBe(0.0);
    expect(gasMax!.max).toBe(1.0);
    expect(gasMax!.step).toBe(0.05);
  });

  it('should parse and serialize generator options including GeneratorVerticalPowerRange', async () => {
    const lua = `
      SandboxVars = {
          VERSION = 6,
          GeneratorFuelConsumption = 0.05,
          GeneratorSpawning = 4,
          AllowExteriorGenerator = true,
          GeneratorTileRange = 25,
          GeneratorVerticalPowerRange = 5,
          FuelStationGasInfinite = false,
          FuelStationGasEmptyChance = 15,
          FuelStationGasMin = 0.1,
          FuelStationGasMax = 0.9,
      }
    `;

    const parsed = parseLuaTable(lua) as Record<string, unknown>;
    expect(parsed.GeneratorFuelConsumption).toBe(0.05);
    expect(parsed.GeneratorSpawning).toBe(4);
    expect(parsed.AllowExteriorGenerator).toBe(true);
    expect(parsed.GeneratorTileRange).toBe(25);
    expect(parsed.GeneratorVerticalPowerRange).toBe(5);
    expect(parsed.FuelStationGasInfinite).toBe(false);
    expect(parsed.FuelStationGasEmptyChance).toBe(15);
    expect(parsed.FuelStationGasMin).toBe(0.1);
    expect(parsed.FuelStationGasMax).toBe(0.9);

    // Test saving/serializing
    vi.mocked(fs.readFile).mockResolvedValue(lua);
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);
    vi.mocked(fs.rename).mockResolvedValue(undefined);

    const saveResult = await saveSandboxVars({
      GeneratorVerticalPowerRange: 7,
      GeneratorFuelConsumption: 0.15,
    });
    expect(saveResult.success).toBe(true);

    const writtenLua = vi.mocked(fs.writeFile).mock.calls[0][1] as string;
    expect(writtenLua).toContain('GeneratorVerticalPowerRange = 7');
    expect(writtenLua).toContain('GeneratorFuelConsumption = 0.15');
    expect(writtenLua).toContain('GeneratorTileRange = 25');
  });

  it('should validate generator options against sandboxVarsSchema', () => {
    const validGeneratorConfig = {
      GeneratorFuelConsumption: 0.1,
      GeneratorSpawning: 4,
      AllowExteriorGenerator: true,
      GeneratorTileRange: 20,
      GeneratorVerticalPowerRange: 3,
      FuelStationGasInfinite: false,
      FuelStationGasEmptyChance: 20,
      FuelStationGasMin: 0.0,
      FuelStationGasMax: 0.8,
    };

    const result = sandboxVarsSchema.safeParse(validGeneratorConfig);
    expect(result.success).toBe(true);
  });
});

describe('sandboxUtils - Animal, Wildlife & Vermin Build 42 Options', () => {
  it('should correctly define all animal, wildlife, and vermin fields in SANDBOX_CATEGORIES', () => {
    const advancedCat = SANDBOX_CATEGORIES.find((c) => c.id === 'advanced');
    expect(advancedCat).toBeDefined();

    const fieldsMap = new Map(advancedCat!.fields.map((f) => [f.key, f]));

    // Animal stats
    const statsMod = fieldsMap.get('AnimalStatsModifier');
    expect(statsMod).toBeDefined();
    expect(statsMod!.type).toBe('select');
    expect(statsMod!.defaultValue).toBe(4);
    expect(statsMod!.options).toHaveLength(6);

    const metaStatsMod = fieldsMap.get('AnimalMetaStatsModifier');
    expect(metaStatsMod).toBeDefined();
    expect(metaStatsMod!.type).toBe('select');
    expect(metaStatsMod!.defaultValue).toBe(4);

    const pregTime = fieldsMap.get('AnimalPregnancyTime');
    expect(pregTime).toBeDefined();
    expect(pregTime!.type).toBe('select');
    expect(pregTime!.defaultValue).toBe(4);

    const ageMod = fieldsMap.get('AnimalAgeModifier');
    expect(ageMod).toBeDefined();
    expect(ageMod!.type).toBe('select');
    expect(ageMod!.defaultValue).toBe(4);

    const milkMod = fieldsMap.get('AnimalMilkIncModifier');
    expect(milkMod).toBeDefined();
    expect(milkMod!.type).toBe('select');
    expect(milkMod!.defaultValue).toBe(4);

    const woolMod = fieldsMap.get('AnimalWoolIncModifier');
    expect(woolMod).toBeDefined();
    expect(woolMod!.type).toBe('select');
    expect(woolMod!.defaultValue).toBe(4);

    const eggHatch = fieldsMap.get('AnimalEggHatch');
    expect(eggHatch).toBeDefined();
    expect(eggHatch!.type).toBe('select');
    expect(eggHatch!.defaultValue).toBe(4);

    const ranchChance = fieldsMap.get('AnimalRanchChance');
    expect(ranchChance).toBeDefined();
    expect(ranchChance!.type).toBe('select');
    expect(ranchChance!.defaultValue).toBe(5);
    expect(ranchChance!.options).toHaveLength(7);

    const matingSeason = fieldsMap.get('AnimalMatingSeason');
    expect(matingSeason).toBeDefined();
    expect(matingSeason!.type).toBe('boolean');
    expect(matingSeason!.defaultValue).toBe(true);

    const metaPredator = fieldsMap.get('AnimalMetaPredator');
    expect(metaPredator).toBeDefined();
    expect(metaPredator!.type).toBe('boolean');
    expect(metaPredator!.defaultValue).toBe(false);

    const soundZombies = fieldsMap.get('AnimalSoundAttractZombies');
    expect(soundZombies).toBeDefined();
    expect(soundZombies!.type).toBe('boolean');
    expect(soundZombies!.defaultValue).toBe(true);

    const grassRegrow = fieldsMap.get('AnimalGrassRegrowTime');
    expect(grassRegrow).toBeDefined();
    expect(grassRegrow!.type).toBe('number');
    expect(grassRegrow!.defaultValue).toBe(240);
    expect(grassRegrow!.min).toBe(1);
    expect(grassRegrow!.max).toBe(9999);

    const trackChance = fieldsMap.get('AnimalTrackChance');
    expect(trackChance).toBeDefined();
    expect(trackChance!.type).toBe('select');
    expect(trackChance!.defaultValue).toBe(4);

    const pathChance = fieldsMap.get('AnimalPathChance');
    expect(pathChance).toBeDefined();
    expect(pathChance!.type).toBe('select');
    expect(pathChance!.defaultValue).toBe(4);

    const maxRat = fieldsMap.get('MaximumRatIndex');
    expect(maxRat).toBeDefined();
    expect(maxRat!.type).toBe('number');
    expect(maxRat!.defaultValue).toBe(25);
    expect(maxRat!.min).toBe(0);
    expect(maxRat!.max).toBe(50);

    const daysRat = fieldsMap.get('DaysUntilMaximumRatIndex');
    expect(daysRat).toBeDefined();
    expect(daysRat!.type).toBe('number');
    expect(daysRat!.defaultValue).toBe(90);
    expect(daysRat!.min).toBe(0);
    expect(daysRat!.max).toBe(365);

    // MultiplierConfig skills
    const husbandry = fieldsMap.get('Husbandry');
    expect(husbandry).toBeDefined();
    expect(husbandry!.subTable).toBe('MultiplierConfig');

    const tracking = fieldsMap.get('Tracking');
    expect(tracking).toBeDefined();
    expect(tracking!.subTable).toBe('MultiplierConfig');

    const butchering = fieldsMap.get('Butchering');
    expect(butchering).toBeDefined();
    expect(butchering!.subTable).toBe('MultiplierConfig');
  });

  it('should parse and serialize animal options in Lua SandboxVars', async () => {
    const lua = `
      SandboxVars = {
          VERSION = 6,
          AnimalStatsModifier = 4,
          AnimalMetaStatsModifier = 4,
          AnimalPregnancyTime = 3,
          AnimalAgeModifier = 4,
          AnimalMilkIncModifier = 5,
          AnimalWoolIncModifier = 4,
          AnimalEggHatch = 4,
          AnimalRanchChance = 5,
          AnimalGrassRegrowTime = 240,
          AnimalMetaPredator = false,
          AnimalMatingSeason = true,
          AnimalSoundAttractZombies = true,
          AnimalTrackChance = 4,
          AnimalPathChance = 4,
          MaximumRatIndex = 25,
          DaysUntilMaximumRatIndex = 90,
          MultiplierConfig = {
              Husbandry = 1.5,
              Tracking = 2.0,
              Butchering = 1.0,
          },
      }
    `;

    const parsed = parseLuaTable(lua) as Record<string, unknown>;
    expect(parsed.AnimalStatsModifier).toBe(4);
    expect(parsed.AnimalPregnancyTime).toBe(3);
    expect(parsed.AnimalGrassRegrowTime).toBe(240);
    expect(parsed.AnimalMetaPredator).toBe(false);
    expect(parsed.AnimalMatingSeason).toBe(true);
    expect(parsed.AnimalSoundAttractZombies).toBe(true);
    expect(parsed.AnimalTrackChance).toBe(4);
    expect(parsed.AnimalPathChance).toBe(4);
    expect(parsed.MaximumRatIndex).toBe(25);
    expect(parsed.DaysUntilMaximumRatIndex).toBe(90);

    const multConfig = parsed.MultiplierConfig as Record<string, number>;
    expect(multConfig.Husbandry).toBe(1.5);
    expect(multConfig.Tracking).toBe(2.0);
    expect(multConfig.Butchering).toBe(1.0);

    // Test saving/serializing
    vi.mocked(fs.readFile).mockResolvedValue(lua);
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);
    vi.mocked(fs.rename).mockResolvedValue(undefined);

    const saveResult = await saveSandboxVars({
      AnimalMetaPredator: true,
      AnimalGrassRegrowTime: 120,
      AnimalStatsModifier: 5,
    });
    expect(saveResult.success).toBe(true);

    const writtenLua = vi.mocked(fs.writeFile).mock.calls[0][1] as string;
    expect(writtenLua).toContain('AnimalMetaPredator = true');
    expect(writtenLua).toContain('AnimalGrassRegrowTime = 120');
    expect(writtenLua).toContain('AnimalStatsModifier = 5');
  });

  it('should validate animal options against sandboxVarsSchema', () => {
    const validAnimalConfig = {
      AnimalStatsModifier: 4,
      AnimalMetaStatsModifier: 4,
      AnimalPregnancyTime: 4,
      AnimalAgeModifier: 4,
      AnimalMilkIncModifier: 4,
      AnimalWoolIncModifier: 4,
      AnimalEggHatch: 4,
      AnimalRanchChance: 5,
      AnimalGrassRegrowTime: 240,
      AnimalMetaPredator: false,
      AnimalMatingSeason: true,
      AnimalSoundAttractZombies: true,
      AnimalTrackChance: 4,
      AnimalPathChance: 4,
      MaximumRatIndex: 25,
      DaysUntilMaximumRatIndex: 90,
      MultiplierConfig: {
        Husbandry: 1.0,
        Tracking: 1.0,
        Butchering: 1.0,
      },
    };

    const result = sandboxVarsSchema.safeParse(validAnimalConfig);
    expect(result.success).toBe(true);
  });
});

