export interface WhitelistUser {
  id: number;
  username: string;
  role: number;
  roleName: string;
  lastConnection: string | null;
  steamid: string | null;
  displayName: string | null;
}

export interface BannedSteamId {
  steamid: string;
  reason: string | null;
}

export interface BannedIp {
  ip: string;
  username: string | null;
  reason: string | null;
}

export interface ConnectedPlayer {
  username: string;
  steamid?: string;
  ping?: number;
  connectedSince?: string;
  ip?: string;
  role?: string;
}

export interface PlayerConnectionEvent {
  id: string;
  timestamp: string;
  username: string;
  steamid?: string;
  ip?: string;
  type: 'CONNECTED' | 'DISCONNECTED';
  coordinates?: string;
}

export interface PlayersOverviewData {
  connectedPlayers: ConnectedPlayer[];
  whitelist: WhitelistUser[];
  bannedSteamIds: BannedSteamId[];
  bannedIps: BannedIp[];
  connectionHistory: PlayerConnectionEvent[];
}
