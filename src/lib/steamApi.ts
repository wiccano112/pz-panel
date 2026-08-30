import { KnownModEntry, SteamQueryFilesRawResponse, WorkshopModItem } from '@/types/workshop';

export const KNOWN_MOD_LOOKUP: Record<string, KnownModEntry> = {
  '2196102849': { modId: 'RavenCreek', mapId: 'RavenCreek', name: 'Raven Creek' },
  '2392709985': { modId: 'tsarslib', name: "Tsar's Common Library v2.0" },
  '2297098490': { modId: 'Arsenal(26)GunFighter', name: 'Arsenal(26) GunFighter' },
  '514427485': { modId: 'Brita_ArmorPack', name: "Brita's Armor Pack" },
  '2590017394': { modId: 'HydrocraftModpack', name: 'Hydrocraft' },
  '2038907269': { modId: 'FilibuRhymesUsedCars', name: "Filibuster Rhymes' Used Cars!" },
};

export const FALLBACK_POPULAR_MODS: WorkshopModItem[] = [
  {
    workshopId: '2196102849',
    name: 'Raven Creek',
    description: 'Raven Creek is a large and dense urban map mod for Project Zomboid.',
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=60',
    subscribers: 280000,
    modId: 'RavenCreek',
    mapId: 'RavenCreek',
    tags: ['Build 42', 'Map'],
  },
  {
    workshopId: '2392709985',
    name: "Tsar's Common Library",
    description: 'Essential shared library module required by various vehicle and animation mods.',
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=60',
    subscribers: 450000,
    modId: 'tsarslib',
    tags: ['Build 42', 'Framework'],
  },
  {
    workshopId: '2297098490',
    name: 'Arsenal(26) GunFighter',
    description: 'Advanced weapon framework adding extensive customization, attachments and mechanics.',
    imageUrl: 'https://images.unsplash.com/photo-1595590424283-b8f17842773f?w=500&auto=format&fit=crop&q=60',
    subscribers: 520000,
    modId: 'Arsenal(26)GunFighter',
    tags: ['Build 42', 'Weapons'],
  },
  {
    workshopId: '514427485',
    name: "Brita's Armor Pack",
    description: 'Adds an immense collection of military, tactical, and civilian armor pieces and clothing.',
    imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500&auto=format&fit=crop&q=60',
    subscribers: 390000,
    modId: 'Brita_ArmorPack',
    tags: ['Build 42', 'Clothing'],
  },
  {
    workshopId: '2590017394',
    name: 'Hydrocraft',
    description: 'Massive crafting overhaul expansion mod adding thousands of items, recipes, and skills.',
    imageUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=500&auto=format&fit=crop&q=60',
    subscribers: 310000,
    modId: 'HydrocraftModpack',
    tags: ['Build 42', 'Crafting'],
  },
  {
    workshopId: '2038907269',
    name: "Filibuster Rhymes' Used Cars!",
    description: 'Lore-friendly vehicles from the late 80s and early 90s complete with custom sounds.',
    imageUrl: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=500&auto=format&fit=crop&q=60',
    subscribers: 360000,
    modId: 'FilibuRhymesUsedCars',
    tags: ['Build 42', 'Vehicles'],
  },
];

interface FetchWorkshopOptions {
  query?: string;
  days?: number;
  tag?: string;
  numperpage?: number;
}

export async function fetchWorkshopMods(
  options: FetchWorkshopOptions = {}
): Promise<{ mods: WorkshopModItem[]; source: 'steam' | 'fallback'; warning?: string }> {
  const apiKey = process.env.STEAM_API_KEY;
  const { query = '', days = 30, tag = 'Build 42', numperpage = 20 } = options;

  if (!apiKey) {
    let filtered = FALLBACK_POPULAR_MODS;
    if (query.trim()) {
      const qLower = query.toLowerCase().trim();
      filtered = FALLBACK_POPULAR_MODS.filter(
        (m) =>
          m.name.toLowerCase().includes(qLower) ||
          m.description.toLowerCase().includes(qLower) ||
          (m.modId && m.modId.toLowerCase().includes(qLower))
      );
    }
    return {
      mods: filtered,
      source: 'fallback',
      warning: 'STEAM_API_KEY is not configured in server environment. Showing curated fallback mods.',
    };
  }

  const endpoint = 'https://api.steampowered.com/IPublishedFileService/QueryFiles/v1/';
  const url = new URL(endpoint);

  url.searchParams.set('key', apiKey);
  url.searchParams.set('appid', '108600');
  url.searchParams.set('query_type', query.trim() ? '0' : '1');
  url.searchParams.set('numperpage', String(Math.min(Math.max(1, numperpage), 50)));
  url.searchParams.set('return_short_description', 'true');
  url.searchParams.set('return_previews', 'true');
  url.searchParams.set('return_tags', 'true');
  url.searchParams.set('days', String(Math.max(0, days)));
  
  if (tag.trim()) {
    url.searchParams.set('requiredtags[0]', tag.trim());
  }
  if (query.trim()) {
    url.searchParams.set('search_text', query.trim());
  }

  // Use 1 hour revalidate for general queries, 60s for specific text queries
  const revalidateSeconds = query.trim() ? 60 : 3600;

  try {
    const res = await fetch(url.toString(), {
      method: 'GET',
      next: { revalidate: revalidateSeconds },
    });

    if (!res.ok) {
      console.warn(`Steam API error: ${res.status} ${res.statusText}`);
      return {
        mods: FALLBACK_POPULAR_MODS,
        source: 'fallback',
        warning: `Steam API returned status ${res.status}. Displaying fallback mods.`,
      };
    }

    const data = (await res.json()) as SteamQueryFilesRawResponse;
    const items = data.response?.publishedfiledetails;

    if (!Array.isArray(items)) {
      return {
        mods: [],
        source: 'steam',
      };
    }

    const mappedMods: WorkshopModItem[] = items.map((item) => {
      const known = KNOWN_MOD_LOOKUP[item.publishedfileid];
      const tags = (item.tags || []).map((t) => t.tag);

      return {
        workshopId: item.publishedfileid,
        name: item.title || `Workshop Item ${item.publishedfileid}`,
        description: item.short_description || item.description || '',
        imageUrl: item.preview_url || '',
        subscribers: item.subscriptions || 0,
        modId: known ? known.modId : null,
        mapId: known?.mapId,
        tags,
      };
    });

    return {
      mods: mappedMods,
      source: 'steam',
    };
  } catch (error) {
    console.error('Failed to query Steam Workshop API:', error);
    return {
      mods: FALLBACK_POPULAR_MODS,
      source: 'fallback',
      warning: 'Network failure communicating with Steam API. Displaying fallback mods.',
    };
  }
}
