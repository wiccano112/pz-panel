export interface ActiveWorldInfo {
  hasActiveWorld: boolean;
  instanceName: string | null;
  instanceSlug: string | null;
  restoredFrom: string | null;
  startedAt: string | null;
  serverName: string;
  serverBranch: string;
}

export interface FrozenServerEntry {
  slug: string;
  name: string;
  frozenAt: string;
  serverName: string;
  serverBranch: string;
  gameVersion: string;
  charactersCount: number;
  accountsCount: number;
  vehiclesCount: number;
  modsCount: number;
  uncompressedSize: string;
  archiveSize: string;
  archiveBytes: number;
  notes: string;
}

export interface FreezeCatalogData {
  active: ActiveWorldInfo;
  frozenServers: FrozenServerEntry[];
}

export type FreezeOperationMode =
  | 'freeze-and-new'
  | 'swap'
  | 'freeze-only'
  | 'unfreeze'
  | 'delete';

export interface FreezeOperationInput {
  mode: FreezeOperationMode;
  name?: string;
  notes?: string;
  target?: string;
}

export function slugifyPreview(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

