export const CORE_MAP_NAME = 'Muldraugh, KY';

export const ROLE_MAP: Record<number, string> = {
  1: 'Admin',
  2: 'Moderator',
  3: 'Overseer',
  4: 'GM',
  5: 'User',
};

export const ROLE_OPTIONS = [
  { value: 5, label: 'User (Normal Player)' },
  { value: 4, label: 'GM (Game Master)' },
  { value: 3, label: 'Overseer' },
  { value: 2, label: 'Moderator' },
  { value: 1, label: 'Admin' },
] as const;

export const CATALOG_PAGE_SIZE = 12;

export const METRICS_POLL_INTERVAL_MS = 3000;
export const PLAYERS_POLL_INTERVAL_MS = 6000;
export const CACHE_TTL_MS = 2500;
