export interface SteamFileDetail {
  publishedfileid: string;
  result?: number;
  title?: string;
  description?: string;
  short_description?: string;
  time_created?: number;
  time_updated?: number;
  visibility?: number;
  banned?: boolean;
  accepted_confirmations?: boolean;
  subscriptions?: number;
  favorited?: number;
  views?: number;
  tags?: Array<{ tag: string }>;
  preview_url?: string;
  hcontent_preview?: string;
}

export interface SteamQueryFilesRawResponse {
  response?: {
    total?: number;
    publishedfiledetails?: SteamFileDetail[];
  };
}

export interface WorkshopModItem {
  workshopId: string;
  name: string;
  description: string;
  imageUrl: string;
  subscribers: number;
  modId: string | null;
  mapId?: string;
  tags: string[];
}

export interface WorkshopApiResponse {
  mods: WorkshopModItem[];
  source: 'steam' | 'fallback';
  total: number;
  warning?: string;
}

export interface KnownModEntry {
  modId: string;
  mapId?: string;
  name?: string;
}
