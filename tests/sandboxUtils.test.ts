import { describe, it, expect } from 'vitest';
import { parseLuaTable } from '@/lib/sandboxUtils';

describe('sandboxUtils - Lua Table Parser', () => {
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
});
