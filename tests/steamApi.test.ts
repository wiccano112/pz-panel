import { describe, it, expect } from 'vitest';
import { fetchWorkshopMods, KNOWN_MOD_LOOKUP, FALLBACK_POPULAR_MODS } from '@/lib/steamApi';

describe('steamApi - Workshop Query & Fallbacks', () => {
  it('should return curated fallback mods sorted by subscriber count (most downloaded first)', async () => {
    const result = await fetchWorkshopMods({ query: '', page: 1, numperpage: 10 });
    expect(result.source).toBe('fallback');
    expect(result.mods.length).toBeGreaterThan(0);
    expect(result.warning).toContain('STEAM_API_KEY is not configured');

    // Verify sorted descending by subscribers
    for (let i = 0; i < result.mods.length - 1; i++) {
      expect(result.mods[i].subscribers).toBeGreaterThanOrEqual(result.mods[i + 1].subscribers);
    }
  });

  it('should filter fallback mods by search query', async () => {
    const result = await fetchWorkshopMods({ query: 'Raven Creek' });
    expect(result.source).toBe('fallback');
    expect(result.mods.length).toBe(1);
    expect(result.mods[0].name).toBe('Raven Creek');
  });

  it('should paginate fallback mods accurately', async () => {
    const page1 = await fetchWorkshopMods({ page: 1, numperpage: 2 });
    const page2 = await fetchWorkshopMods({ page: 2, numperpage: 2 });

    expect(page1.mods.length).toBe(2);
    expect(page2.mods.length).toBe(2);
    expect(page1.mods[0].workshopId).not.toBe(page2.mods[0].workshopId);
  });

  it('should have known mod IDs mapped for common Build 42 mods', () => {
    expect(KNOWN_MOD_LOOKUP['2297098490']?.modId).toBe('Arsenal(26)GunFighter');
    expect(KNOWN_MOD_LOOKUP['2688809268']?.modId).toBe('CommonSense');
    expect(KNOWN_MOD_LOOKUP['2196102849']?.modId).toBe('RavenCreek');
  });

  it('should ensure all fallback mods have Build 42 tag', () => {
    for (const mod of FALLBACK_POPULAR_MODS) {
      expect(mod.tags).toContain('Build 42');
    }
  });
});
