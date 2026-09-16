import fs from 'fs';
import path from 'path';

export const CONFIG = {
  serverDir: process.env.PZ_SERVER_DIR ? path.resolve(process.cwd(), process.env.PZ_SERVER_DIR) : '/opt/pz-server',
  hostServerDir: process.env.PZ_HOST_SERVER_DIR || (process.env.PZ_SERVER_DIR ? path.resolve(process.cwd(), process.env.PZ_SERVER_DIR) : '/opt/pz-server'),
  serverName: process.env.PZ_SERVER_NAME || 'servertest',
  containerName: process.env.PZ_DOCKER_CONTAINER || 'pz-server',
  steamApiKey: process.env.STEAM_API_KEY || '',

  get serverCpus(): string {
    if (process.env.PZ_SERVER_CPUS && process.env.PZ_SERVER_CPUS.trim()) {
      return process.env.PZ_SERVER_CPUS.trim();
    }
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
    return '12-17';
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
};

