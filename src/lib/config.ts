import fs from 'fs';
import path from 'path';
import { z } from 'zod';

const cpuRangeSchema = z
  .string()
  .trim()
  .refine(
    (val) => val.toLowerCase() === 'auto' || val === '' || /^[0-9,\s-]+$/.test(val),
    { message: 'Must be "auto" or a valid CPU range (e.g. "3-5" or "0,2,4")' }
  );

const hardwareConfigSchema = z.object({
  serverCpus: cpuRangeSchema.optional(),
  otherCpus: cpuRangeSchema.optional(),
  serverLabel: z.string().trim().min(1).max(40).optional(),
  otherLabel: z.string().trim().min(1).max(40).optional(),
});

export type HardwareConfigFile = z.infer<typeof hardwareConfigSchema>;

export function isExplicitCpuRange(value?: string | null): value is string {
  if (!value) return false;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.toLowerCase() !== 'auto';
}

export function readHardwareConfig(customPath?: string): HardwareConfigFile | null {
  const configPath = customPath || CONFIG.hardwareConfigPath;
  try {
    if (!fs.existsSync(configPath)) return null;
    const raw = fs.readFileSync(configPath, 'utf8');
    const parsedJson: unknown = JSON.parse(raw);
    const result = hardwareConfigSchema.safeParse(parsedJson);
    if (!result.success) return null;
    return result.data;
  } catch {
    return null;
  }
}

export const CONFIG = {
  serverDir: process.env.PZ_SERVER_DIR ? path.resolve(process.cwd(), process.env.PZ_SERVER_DIR) : '/opt/pz-server',
  hostServerDir: process.env.PZ_HOST_SERVER_DIR || (process.env.PZ_SERVER_DIR ? path.resolve(process.cwd(), process.env.PZ_SERVER_DIR) : '/opt/pz-server'),
  serverName: process.env.PZ_SERVER_NAME || 'servertest',
  containerName: process.env.PZ_DOCKER_CONTAINER || 'pz-server',
  steamApiKey: process.env.STEAM_API_KEY || '',
  gameVersion: process.env.PZ_GAME_VERSION || '',

  get hardwareConfigPath(): string {
    if (process.env.PZ_HARDWARE_CONFIG_PATH && process.env.PZ_HARDWARE_CONFIG_PATH.trim()) {
      return path.resolve(process.cwd(), process.env.PZ_HARDWARE_CONFIG_PATH.trim());
    }
    return path.resolve(process.cwd(), 'config', 'hardware.json');
  },

  get composeCpus(): string {
    try {
      const candidates = [
        path.join(this.serverDir, 'docker-compose.yml'),
        path.join(this.serverDir, 'docker-compose.yaml'),
        path.join(this.serverDir, 'compose.yml'),
        path.join(this.serverDir, 'compose.yaml'),
        path.join(this.hostServerDir, 'docker-compose.yml'),
        path.join(this.hostServerDir, 'docker-compose.yaml'),
      ];
      for (const file of candidates) {
        if (fs.existsSync(file)) {
          const content = fs.readFileSync(file, 'utf8');
          const match = content.match(/cpuset\s*:\s*["']?([0-9,\s-]+)["']?/i);
          if (match && match[1]) {
            return match[1].trim();
          }
        }
      }
    } catch {
      // Ignore read errors
    }
    return '';
  },

  get serverCpus(): string {
    const fileConfig = readHardwareConfig();
    if (isExplicitCpuRange(fileConfig?.serverCpus)) {
      return fileConfig.serverCpus.trim();
    }
    if (isExplicitCpuRange(process.env.PZ_SERVER_CPUS)) {
      return process.env.PZ_SERVER_CPUS.trim();
    }
    const fromCompose = this.composeCpus;
    if (fromCompose) {
      return fromCompose;
    }
    return 'auto';
  },

  get otherCpus(): string {
    const fileConfig = readHardwareConfig();
    if (isExplicitCpuRange(fileConfig?.otherCpus)) {
      return fileConfig.otherCpus.trim();
    }
    if (isExplicitCpuRange(process.env.PZ_OTHER_CPUS)) {
      return process.env.PZ_OTHER_CPUS.trim();
    }
    return 'auto';
  },

  get composeFile(): string {
    const candidates = [
      path.join(this.serverDir, 'docker-compose.yml'),
      path.join(this.serverDir, 'docker-compose.yaml'),
      path.join(this.serverDir, 'compose.yml'),
      path.join(this.serverDir, 'compose.yaml'),
      path.join(this.hostServerDir, 'docker-compose.yml'),
    ];
    for (const f of candidates) {
      if (fs.existsSync(f)) return f;
    }
    return path.join(this.serverDir, 'docker-compose.yml');
  },

  get iniPath(): string {
    return path.join(this.serverDir, 'data', 'Server', `${this.serverName}.ini`);
  },

  get sandboxPath(): string {
    return path.join(this.serverDir, 'data', 'Server', `${this.serverName}_SandboxVars.lua`);
  },

  get dbPath(): string {
    return path.join(this.serverDir, 'data', 'db', `${this.serverName}.db`);
  },

  get spawnregionsPath(): string {
    return path.join(this.serverDir, 'data', 'Server', `${this.serverName}_spawnregions.lua`);
  },

  get consoleLogPath(): string {
    return path.join(this.serverDir, 'data', 'server-console.txt');
  },

  get logsDir(): string {
    return path.join(this.serverDir, 'data', 'Logs');
  },

  get freezeScriptPath(): string {
    return path.join(this.serverDir, 'scripts', 'freeze_manager.sh');
  },

  get frozenDir(): string {
    return path.join(this.serverDir, 'frozen');
  },
};
