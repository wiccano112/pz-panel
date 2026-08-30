import fs from 'fs/promises';
import { SandboxVarsData } from '@/types/sandbox';
import { CONFIG } from '@/lib/config';
import { withLock } from '@/lib/mutex';

// --- Lua Tokenizer & AST / Deserializer ---

type TokenType =
  | 'IDENTIFIER'
  | 'STRING'
  | 'NUMBER'
  | 'BOOLEAN'
  | 'NIL'
  | 'LBRACE'
  | 'RBRACE'
  | 'LBRACKET'
  | 'RBRACKET'
  | 'EQUALS'
  | 'COMMA'
  | 'SEMICOLON';

interface Token {
  type: TokenType;
  value: string | number | boolean | null;
}

function tokenizeLua(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const len = source.length;

  while (i < len) {
    const char = source[i];

    // 1. Whitespace
    if (/\s/.test(char)) {
      i++;
      continue;
    }

    // 2. Comments (-- or --[[ ... ]])
    if (char === '-' && source[i + 1] === '-') {
      if (source.slice(i, i + 4) === '--[[') {
        i += 4;
        const closeIdx = source.indexOf(']]', i);
        i = closeIdx === -1 ? len : closeIdx + 2;
      } else {
        i += 2;
        while (i < len && source[i] !== '\n' && source[i] !== '\r') {
          i++;
        }
      }
      continue;
    }

    // 3. Multiline strings: [[ ... ]]
    if (char === '[' && source[i + 1] === '[') {
      i += 2;
      const start = i;
      const closeIdx = source.indexOf(']]', i);
      const strVal = closeIdx === -1 ? source.slice(start) : source.slice(start, closeIdx);
      tokens.push({ type: 'STRING', value: strVal });
      i = closeIdx === -1 ? len : closeIdx + 2;
      continue;
    }

    // 4. Single character symbols
    if (char === '{') {
      tokens.push({ type: 'LBRACE', value: '{' });
      i++;
      continue;
    }
    if (char === '}') {
      tokens.push({ type: 'RBRACE', value: '}' });
      i++;
      continue;
    }
    if (char === '[') {
      tokens.push({ type: 'LBRACKET', value: '[' });
      i++;
      continue;
    }
    if (char === ']') {
      tokens.push({ type: 'RBRACKET', value: ']' });
      i++;
      continue;
    }
    if (char === '=') {
      tokens.push({ type: 'EQUALS', value: '=' });
      i++;
      continue;
    }
    if (char === ',') {
      tokens.push({ type: 'COMMA', value: ',' });
      i++;
      continue;
    }
    if (char === ';') {
      tokens.push({ type: 'SEMICOLON', value: ';' });
      i++;
      continue;
    }

    // 5. Quoted Strings ("..." or '...')
    if (char === '"' || char === "'") {
      const quote = char;
      i++;
      let strVal = '';
      while (i < len && source[i] !== quote) {
        if (source[i] === '\\' && i + 1 < len) {
          const next = source[i + 1];
          if (next === 'n') strVal += '\n';
          else if (next === 'r') strVal += '\r';
          else if (next === 't') strVal += '\t';
          else if (next === '"' || next === "'" || next === '\\') strVal += next;
          else strVal += next;
          i += 2;
        } else {
          strVal += source[i];
          i++;
        }
      }
      if (i < len && source[i] === quote) {
        i++;
      }
      tokens.push({ type: 'STRING', value: strVal });
      continue;
    }

    // 6. Numbers (including negative, float, exponent)
    if (/[\d]/.test(char) || (char === '-' && /[\d]/.test(source[i + 1] || ''))) {
      const start = i;
      if (char === '-') i++;
      while (i < len && /[\d.]/.test(source[i])) {
        i++;
      }
      // Scientific notation e/E
      if (i < len && (source[i] === 'e' || source[i] === 'E')) {
        i++;
        if (i < len && (source[i] === '+' || source[i] === '-')) i++;
        while (i < len && /[\d]/.test(source[i])) i++;
      }
      const numStr = source.slice(start, i);
      const parsedNum = Number(numStr);
      tokens.push({ type: 'NUMBER', value: isNaN(parsedNum) ? numStr : parsedNum });
      continue;
    }

    // 7. Identifiers, Booleans, Nil
    if (/[a-zA-Z_]/.test(char)) {
      const start = i;
      while (i < len && /[a-zA-Z0-9_]/.test(source[i])) {
        i++;
      }
      const ident = source.slice(start, i);
      if (ident === 'true') {
        tokens.push({ type: 'BOOLEAN', value: true });
      } else if (ident === 'false') {
        tokens.push({ type: 'BOOLEAN', value: false });
      } else if (ident === 'nil') {
        tokens.push({ type: 'NIL', value: null });
      } else {
        tokens.push({ type: 'IDENTIFIER', value: ident });
      }
      continue;
    }

    // Fallback advance for unrecognized character
    i++;
  }

  return tokens;
}

class LuaTableParser {
  private tokens: Token[];
  private cursor = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(): Token | undefined {
    return this.tokens[this.cursor];
  }

  private next(): Token | undefined {
    return this.tokens[this.cursor++];
  }

  private match(type: TokenType): boolean {
    if (this.peek()?.type === type) {
      this.cursor++;
      return true;
    }
    return false;
  }

  public parse(): Record<string, unknown> {
    // If starts with "SandboxVars = {" or similar assignment, skip identifier and equals
    if (
      this.cursor < this.tokens.length - 2 &&
      this.tokens[this.cursor].type === 'IDENTIFIER' &&
      this.tokens[this.cursor + 1].type === 'EQUALS' &&
      this.tokens[this.cursor + 2].type === 'LBRACE'
    ) {
      this.cursor += 2; // Move past identifier and equals to LBRACE
    }

    if (this.peek()?.type === 'LBRACE') {
      const parsed = this.parseTable();
      return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};
    }

    // Top-level key = value pairs without enclosing brace
    const result: Record<string, unknown> = {};
    while (this.cursor < this.tokens.length) {
      const entry = this.parseTableEntry();
      if (entry) {
        result[entry.key] = entry.value;
      } else {
        this.cursor++;
      }
    }
    return result;
  }

  private parseTable(): Record<string, unknown> | unknown[] {
    if (!this.match('LBRACE')) return {};

    const tableObj: Record<string, unknown> = {};
    let isArray = true;
    let arrayIndex = 1;
    const arrayItems: unknown[] = [];

    while (this.cursor < this.tokens.length) {
      if (this.peek()?.type === 'RBRACE') {
        this.cursor++;
        break;
      }

      // Check if entry has explicit key (e.g. key = val or [key] = val)
      if (
        this.peek()?.type === 'IDENTIFIER' &&
        this.tokens[this.cursor + 1]?.type === 'EQUALS'
      ) {
        isArray = false;
        const keyToken = this.next()!;
        this.match('EQUALS');
        const val = this.parseValue();
        tableObj[String(keyToken.value)] = val;
      } else if (
        this.peek()?.type === 'LBRACKET' &&
        (this.tokens[this.cursor + 1]?.type === 'STRING' || this.tokens[this.cursor + 1]?.type === 'NUMBER') &&
        this.tokens[this.cursor + 2]?.type === 'RBRACKET' &&
        this.tokens[this.cursor + 3]?.type === 'EQUALS'
      ) {
        isArray = false;
        this.match('LBRACKET');
        const keyToken = this.next()!;
        this.match('RBRACKET');
        this.match('EQUALS');
        const val = this.parseValue();
        tableObj[String(keyToken.value)] = val;
      } else {
        // Positional value
        const val = this.parseValue();
        tableObj[String(arrayIndex)] = val;
        arrayItems.push(val);
        arrayIndex++;
      }

      // Optional separator (, or ;)
      if (!this.match('COMMA')) {
        this.match('SEMICOLON');
      }
    }

    return isArray && arrayItems.length > 0 ? arrayItems : tableObj;
  }

  private parseTableEntry(): { key: string; value: unknown } | null {
    if (this.cursor >= this.tokens.length) return null;

    if (
      this.peek()?.type === 'IDENTIFIER' &&
      this.tokens[this.cursor + 1]?.type === 'EQUALS'
    ) {
      const keyToken = this.next()!;
      this.match('EQUALS');
      const val = this.parseValue();
      if (!this.match('COMMA')) {
        this.match('SEMICOLON');
      }
      return { key: String(keyToken.value), value: val };
    }
    return null;
  }

  private parseValue(): unknown {
    const token = this.peek();
    if (!token) return null;

    if (token.type === 'LBRACE') {
      return this.parseTable();
    }
    if (
      token.type === 'STRING' ||
      token.type === 'NUMBER' ||
      token.type === 'BOOLEAN' ||
      token.type === 'NIL'
    ) {
      this.cursor++;
      return token.value;
    }
    if (token.type === 'IDENTIFIER') {
      this.cursor++;
      return String(token.value);
    }

    this.cursor++;
    return token.value;
  }
}

export function parseLuaTable(luaSource: string): Record<string, unknown> {
  const tokens = tokenizeLua(luaSource);
  const parser = new LuaTableParser(tokens);
  return parser.parse();
}

function serializeLuaValue(val: unknown, depth = 1): string {
  const indent = '    '.repeat(depth);
  if (val === null || val === undefined) return 'nil';
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (typeof val === 'number') return isNaN(val) ? '1' : String(val);
  if (typeof val === 'string') {
    const sanitized = val.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r/g, '').replace(/\n/g, '\\n');
    return `"${sanitized}"`;
  }
  if (Array.isArray(val)) {
    if (val.length === 0) return '{}';
    const items = val.map((item) => `${indent}    ${serializeLuaValue(item, depth + 1)},`).join('\n');
    return `{\n${items}\n${indent}}`;
  }
  if (typeof val === 'object') {
    const entries = Object.entries(val as Record<string, unknown>);
    if (entries.length === 0) return '{}';
    const lines = entries.map(([k, v]) => {
      const formattedKey = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(k) ? k : `["${k.replace(/"/g, '\\"')}"]`;
      return `${indent}    ${formattedKey} = ${serializeLuaValue(v, depth + 1)},`;
    });
    return `{\n${lines.join('\n')}\n${indent}}`;
  }
  return `"${String(val)}"`;
}

export async function readSandboxVars(): Promise<SandboxVarsData> {
  try {
    const content = await fs.readFile(CONFIG.sandboxPath, 'utf-8');
    const parsed = parseLuaTable(content);
    return parsed as SandboxVarsData;
  } catch (error) {
    console.error('Failed to read SandboxVars.lua:', error);
    return {};
  }
}

export async function saveSandboxVars(updatedVars: SandboxVarsData): Promise<{ success: boolean; error?: string }> {
  return withLock('sandbox_vars_file', async () => {
    try {
      const existing = await readSandboxVars();
      const merged: SandboxVarsData = { ...existing, ...updatedVars };

      // Ensure VERSION = 6 is preserved at top
      let lua = 'SandboxVars = {\n';
      lua += `    VERSION = ${merged.VERSION !== undefined ? merged.VERSION : 6},\n`;

      for (const [key, val] of Object.entries(merged)) {
        if (key === 'VERSION') continue;

        const formattedKey = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key) ? key : `["${key.replace(/"/g, '\\"')}"]`;
        if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
          const subEntries = Object.entries(val as Record<string, unknown>);
          lua += `    ${formattedKey} = {\n`;
          for (const [subKey, subVal] of subEntries) {
            const formattedSubKey = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(subKey) ? subKey : `["${subKey.replace(/"/g, '\\"')}"]`;
            lua += `        ${formattedSubKey} = ${serializeLuaValue(subVal, 2)},\n`;
          }
          lua += '    },\n';
        } else {
          lua += `    ${formattedKey} = ${serializeLuaValue(val, 1)},\n`;
        }
      }

      lua += '}\n';

      // Atomic file write using temporary file
      const tmpPath = `${CONFIG.sandboxPath}.tmp.${Date.now()}`;
      await fs.writeFile(tmpPath, lua, 'utf-8');
      await fs.rename(tmpPath, CONFIG.sandboxPath);

      return { success: true };
    } catch (error) {
      console.error('Failed to write SandboxVars.lua:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });
}

