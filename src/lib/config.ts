import fs from 'fs';
import path from 'path';

export const CONFIG = {
  serverDir: process.env.PZ_SERVER_DIR ? path.resolve(process.cwd(), process.env.PZ_SERVER_DIR) : '/opt/pz-server',
  hostServerDir: process.env.PZ_HOST_SERVER_DIR || (process.env.PZ_SERVER_DIR ? path.resolve(process.cwd(), process.env.PZ_SERVER_DIR) : '/opt/pz-server'),
  serverName: process.env.PZ_SERVER_NAME || 'servertest',
  containerName: process.env.PZ_DOCKER_CONTAINER || 'pz-server',
  steamApiKey: process.env.STEAM_API_KEY || '',

  get serverCpus(): string {
    if (process.env.PZ_SERVER_CPUS) {
      return process.env.PZ_SERVER_CPUS;
    }
    try {
      if (fs.existsSync(this.composeFile)) {
        const content = fs.readFileSync(this.composeFile, 'utf8');
        const match = content.match(/cpuset\s*:\s*["']?([0-9,\s-]+)["']?/i);
        if (match && match[1]) {
          return match[1].trim();
        }
      }
    } catch {
      // Ignore read errors
    }
    return '12-15';
  },

  get composeFile(): string {
    return path.join(this.hostServerDir, 'docker-compose.yml');
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
};

