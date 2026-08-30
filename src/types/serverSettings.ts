export type ServerPropertyType = 'boolean' | 'number' | 'string' | 'select';

export interface PropertyMeta {
  key: string;
  label: string;
  description: string;
  type: ServerPropertyType;
  category: 'backups' | 'performance' | 'gameplay' | 'network';
  defaultValue: string | number | boolean;
  min?: number;
  max?: number;
  options?: Array<{ label: string; value: string | number }>;
}

export interface SpawnRegionItem {
  name: string;
  file: string;
  isOfficial?: boolean;
}

export interface ServerSettingsData {
  properties: Record<string, string>;
  spawnRegions: SpawnRegionItem[];
}
