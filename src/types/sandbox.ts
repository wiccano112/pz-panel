export interface SandboxCategoryGroup {
  id: string;
  name: string;
  description: string;
  icon: string;
  fields: SandboxFieldDefinition[];
}

export type SandboxFieldType = 'number' | 'boolean' | 'select' | 'string';

export interface SandboxOption {
  value: number | string;
  label: string;
}

export interface SandboxFieldDefinition {
  key: string;
  label: string;
  description: string;
  type: SandboxFieldType;
  options?: SandboxOption[];
  min?: number;
  max?: number;
  step?: number;
  defaultValue: string | number | boolean;
  subTable?: string; // e.g. 'ZombieLore', 'Loot'
}

export type SandboxVarsData = Record<string, string | number | boolean | Record<string, string | number | boolean>>;
