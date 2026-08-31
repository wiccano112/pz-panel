import path from 'path';

export const CONFIG = {
  serverDir: process.env.PZ_SERVER_DIR ? path.resolve(process.cwd(), process.env.PZ_SERVER_DIR) : '/opt/pz-server',
  serverName: process.env.PZ_SERVER_NAME || 'servertest',
  containerName: process.env.PZ_DOCKER_CONTAINER || 'pz-server',
  steamApiKey: process.env.STEAM_API_KEY || '',

  get composeFile(): string {
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

