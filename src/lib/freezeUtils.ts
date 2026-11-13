import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { CONFIG } from '@/lib/config';
import { withLock } from '@/lib/mutex';
import { invalidateCache } from '@/lib/cache';
import {
  ActiveWorldInfo,
  FreezeCatalogData,
  FreezeOperationInput,
  FrozenServerEntry,
  slugifyPreview,
} from '@/types/freeze';

export { slugifyPreview };

const execFileAsync = promisify(execFile);

const SLUG_REGEX = /^[a-z0-9][a-z0-9_-]{0,127}$/i;

export const freezeSlugSchema = z
  .string()
  .trim()
  .min(1, 'Target world slug is required')
  .max(128, 'Target world slug is too long')
  .regex(SLUG_REGEX, 'Invalid world slug format');

export const freezeNameSchema = z
  .string()
  .trim()
  .min(1, 'World name is required')
  .max(80, 'World name must be 80 characters or fewer')
  .refine((val) => !val.startsWith('-'), 'World name cannot start with a hyphen (-)');

export const freezeNotesSchema = z
  .string()
  .trim()
  .max(300, 'Notes must be 300 characters or fewer')
  .refine((val) => !val.startsWith('-'), 'Notes cannot start with a hyphen (-)')
  .optional()
  .default('');

export const freezeOperationSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('freeze-and-new'),
    name: freezeNameSchema,
    notes: freezeNotesSchema,
  }),
  z.object({
    mode: z.literal('swap'),
    name: freezeNameSchema,
    notes: freezeNotesSchema,
    target: freezeSlugSchema,
  }),
  z.object({
    mode: z.literal('freeze-only'),
    name: freezeNameSchema,
    notes: freezeNotesSchema,
  }),
  z.object({
    mode: z.literal('unfreeze'),
    target: freezeSlugSchema,
  }),
  z.object({
    mode: z.literal('delete'),
    target: freezeSlugSchema,
  }),
]);

export function sanitizeManifestText(input: string | undefined): string {
  if (!input) return '';
  return input
    .replace(/[\r\n\x00-\x1F]+/g, ' ')
    .replace(/[$`\\]/g, '')
    .replace(/"/g, "'")
    .trim();
}

function normalizeRestoredFrom(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const trimmed = raw.trim();
  if (trimmed === 'fresh_start') return 'fresh_start';
  // Prevent leaking raw host or container paths (Rule 5)
  const base = path.basename(trimmed.replace(/\/+$/, ''));
  return base || null;
}

function normalizeInstanceName(raw: unknown, hasActiveWorld: boolean): string | null {
  if (typeof raw !== 'string' || !raw.trim()) {
    return hasActiveWorld ? CONFIG.serverName : null;
  }
  // Ensure English UI consistency (Rule 9)
  return raw.trim().replace(/^Nuevo Mundo\b/i, 'Fresh World');
}

function normalizeGameVersion(raw: unknown): string {
  if (typeof raw !== 'string' || !raw.trim()) return 'Unknown';
  const trimmed = raw.trim();
  if (trimmed.toLowerCase() === 'desconocida' || trimmed.toLowerCase() === 'n/a') {
    return 'Unknown';
  }
  return trimmed;
}

export function normalizeFreezeCatalog(raw: unknown): FreezeCatalogData {
  const obj = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  const rawActive =
    typeof obj.active === 'object' && obj.active !== null
      ? (obj.active as Record<string, unknown>)
      : {};

  const hasActiveWorld = Boolean(rawActive.hasActiveWorld);

  const active: ActiveWorldInfo = {
    hasActiveWorld,
    instanceName: normalizeInstanceName(rawActive.instanceName, hasActiveWorld),
    instanceSlug:
      typeof rawActive.instanceSlug === 'string' && rawActive.instanceSlug.trim()
        ? rawActive.instanceSlug.trim()
        : null,
    restoredFrom: normalizeRestoredFrom(rawActive.restoredFrom),
    startedAt:
      typeof rawActive.startedAt === 'string' && rawActive.startedAt.trim()
        ? rawActive.startedAt.trim()
        : null,
    serverName:
      typeof rawActive.serverName === 'string' && rawActive.serverName.trim()
        ? rawActive.serverName.trim()
        : CONFIG.serverName,
    serverBranch:
      typeof rawActive.serverBranch === 'string' && rawActive.serverBranch.trim()
        ? rawActive.serverBranch.trim()
        : 'stable',
  };

  const rawList = Array.isArray(obj.frozenServers) ? obj.frozenServers : [];
  const frozenServers: FrozenServerEntry[] = rawList
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .map((item) => ({
      slug: typeof item.slug === 'string' ? item.slug.trim() : '',
      name: typeof item.name === 'string' && item.name.trim() ? item.name.trim() : String(item.slug || 'Unnamed World'),
      frozenAt: typeof item.frozenAt === 'string' ? item.frozenAt.trim() : '',
      serverName:
        typeof item.serverName === 'string' && item.serverName.trim()
          ? item.serverName.trim()
          : CONFIG.serverName,
      serverBranch:
        typeof item.serverBranch === 'string' && item.serverBranch.trim()
          ? item.serverBranch.trim()
          : 'stable',
      gameVersion: normalizeGameVersion(item.gameVersion),
      charactersCount: Number(item.charactersCount) || 0,
      accountsCount: Number(item.accountsCount) || 0,
      vehiclesCount: Number(item.vehiclesCount) || 0,
      modsCount: Number(item.modsCount) || 0,
      uncompressedSize:
        typeof item.uncompressedSize === 'string' && item.uncompressedSize.trim()
          ? item.uncompressedSize.trim()
          : '0B',
      archiveSize:
        typeof item.archiveSize === 'string' && item.archiveSize.trim()
          ? item.archiveSize.trim()
          : '0B',
      archiveBytes: Number(item.archiveBytes) || 0,
      notes: typeof item.notes === 'string' ? item.notes.trim() : '',
    }))
    .filter((item) => Boolean(item.slug));

  return { active, frozenServers };
}

function getScriptExecEnv(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    DATA_PATH: path.join(CONFIG.serverDir, 'data'),
    FROZEN_DIR: CONFIG.frozenDir,
    HOST_DATA_PATH: path.join(CONFIG.hostServerDir, 'data'),
  };
}

function parseEnvFileSync(filePath: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!fs.existsSync(filePath)) return result;
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#') || !line.includes('=')) continue;
      const eqIdx = line.indexOf('=');
      const key = line.slice(0, eqIdx).trim();
      const val = line.slice(eqIdx + 1).trim().replace(/^"|"$/g, '');
      result[key] = val;
    }
  } catch {
    // Ignore read errors
  }
  return result;
}

function readCatalogFallback(): FreezeCatalogData {
  const dataPath = path.join(CONFIG.serverDir, 'data');
  const frozenDir = CONFIG.frozenDir;
  const serverName = CONFIG.serverName;

  const hasActiveWorld =
    fs.existsSync(path.join(dataPath, 'Saves', 'Multiplayer', serverName)) ||
    fs.existsSync(path.join(dataPath, 'Server', `${serverName}.ini`)) ||
    fs.existsSync(path.join(dataPath, 'db', `${serverName}.db`));

  const activeMeta = parseEnvFileSync(path.join(dataPath, '.active_instance.env'));

  const rawItems: Array<Record<string, unknown>> = [];
  if (fs.existsSync(frozenDir)) {
    try {
      const entries = fs.readdirSync(frozenDir).sort();
      for (const entry of entries) {
        const subDir = path.join(frozenDir, entry);
        const archivePath = path.join(subDir, 'server_state.tar.gz');
        const manifestPath = path.join(subDir, 'manifest.env');
        if (fs.existsSync(archivePath) && fs.statSync(subDir).isDirectory()) {
          const m = parseEnvFileSync(manifestPath);
          const stat = fs.statSync(archivePath);
          rawItems.push({
            slug: m.FREEZE_SLUG || entry,
            name: m.FREEZE_NAME || entry,
            frozenAt: m.FROZEN_AT || '',
            serverName: m.SERVER_NAME || serverName,
            serverBranch: m.SERVER_BRANCH || 'stable',
            gameVersion: m.GAME_VERSION || 'Unknown',
            charactersCount: parseInt(m.CHARACTERS_COUNT || '0', 10) || 0,
            accountsCount: parseInt(m.ACCOUNTS_COUNT || '0', 10) || 0,
            vehiclesCount: parseInt(m.VEHICLES_COUNT || '0', 10) || 0,
            modsCount: parseInt(m.MODS_COUNT || '0', 10) || 0,
            uncompressedSize: m.UNCOMPRESSED_SIZE || '0B',
            archiveSize: m.ARCHIVE_SIZE || '0B',
            archiveBytes: stat.size,
            notes: m.NOTES || '',
          });
        }
      }
    } catch {
      // Ignore directory read errors
    }
  }

  rawItems.sort((a, b) => String(b.frozenAt || '').localeCompare(String(a.frozenAt || '')));

  return normalizeFreezeCatalog({
    active: {
      hasActiveWorld,
      instanceName: activeMeta.INSTANCE_NAME || (hasActiveWorld ? serverName : null),
      instanceSlug: activeMeta.INSTANCE_SLUG || null,
      restoredFrom: activeMeta.RESTORED_FROM || null,
      startedAt: activeMeta.STARTED_AT || null,
      serverName,
      serverBranch: 'stable',
    },
    frozenServers: rawItems,
  });
}

export async function getFreezeCatalog(): Promise<FreezeCatalogData> {
  try {
    const { stdout } = await execFileAsync(CONFIG.freezeScriptPath, ['--list', '--json'], {
      cwd: CONFIG.serverDir,
      env: getScriptExecEnv(),
      timeout: 15_000,
      maxBuffer: 5 * 1024 * 1024,
    });
    const parsed = JSON.parse(stdout);
    return normalizeFreezeCatalog(parsed);
  } catch {
    return readCatalogFallback();
  }
}

export function buildFreezeCliArgs(validated: z.infer<typeof freezeOperationSchema>): string[] {
  switch (validated.mode) {
    case 'freeze-and-new': {
      const args = ['--freeze-and-new', '--name', sanitizeManifestText(validated.name)];
      const cleanNotes = sanitizeManifestText(validated.notes);
      if (cleanNotes) {
        args.push('--notes', cleanNotes);
      }
      args.push('-y');
      return args;
    }
    case 'swap': {
      const args = ['--swap', '--name', sanitizeManifestText(validated.name)];
      const cleanNotes = sanitizeManifestText(validated.notes);
      if (cleanNotes) {
        args.push('--notes', cleanNotes);
      }
      args.push('--target', validated.target, '-y');
      return args;
    }
    case 'freeze-only': {
      const args = ['--freeze-only', '--name', sanitizeManifestText(validated.name)];
      const cleanNotes = sanitizeManifestText(validated.notes);
      if (cleanNotes) {
        args.push('--notes', cleanNotes);
      }
      args.push('-y');
      return args;
    }
    case 'unfreeze': {
      return ['--unfreeze', '--target', validated.target, '-y'];
    }
    case 'delete': {
      return ['--delete', '--target', validated.target, '-y'];
    }
  }
}

export async function executeFreezeOperation(
  rawInput: FreezeOperationInput
): Promise<{ success: boolean; message: string; error?: string }> {
  const parsed = freezeOperationSchema.safeParse(rawInput);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join(', ');
    return { success: false, message: msg, error: msg };
  }

  const validated = parsed.data;
  const cliArgs = buildFreezeCliArgs(validated);

  return withLock('freeze_manager', async () => {
    try {
      await execFileAsync(CONFIG.freezeScriptPath, cliArgs, {
        cwd: CONFIG.serverDir,
        env: getScriptExecEnv(),
        timeout: 300_000,
        maxBuffer: 10 * 1024 * 1024,
      });

      invalidateCache();

      switch (validated.mode) {
        case 'freeze-and-new':
          return {
            success: true,
            message: `World frozen as "${validated.name}" and a fresh server instance has been started.`,
          };
        case 'swap':
          return {
            success: true,
            message: `Active world frozen as "${validated.name}" and swapped to "${validated.target}".`,
          };
        case 'freeze-only':
          return {
            success: true,
            message: `World frozen as "${validated.name}", active slot cleared, and server shut down.`,
          };
        case 'unfreeze':
          return {
            success: true,
            message: `Frozen world "${validated.target}" thawed and started in the active slot.`,
          };
        case 'delete':
          return {
            success: true,
            message: `Frozen world "${validated.target}" permanently deleted from the vault.`,
          };
      }
    } catch (err) {
      const rawErr =
        err && typeof err === 'object' && 'stderr' in err && typeof err.stderr === 'string' && err.stderr.trim()
          ? err.stderr.trim()
          : err instanceof Error
            ? err.message
            : String(err);
      // Strip ANSI escape codes and mask any host paths
      const cleanErr = rawErr
        .replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '')
        .replace(/\/home\/[^\s/]+/g, '/opt')
        .trim();

      return {
        success: false,
        message: `Freeze operation (${validated.mode}) failed: ${cleanErr || 'Unknown error'}`,
        error: cleanErr || 'Unknown error',
      };
    }
  });
}
