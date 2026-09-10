import { describe, it, expect } from 'vitest';
import { fetchWorkshopMods } from '@/lib/steamApi';

describe('steamApi - Workshop Query & Fallbacks', () => {
  it('should return curated fallback mods when no API key is provided', async () => {
    const result = await fetchWorkshopMods({ query: '', page: 1, numperpage: 10 });
    expect(result.source).toBe('fallback');
    expect(result.mods.length).toBeGreaterThan(0);
    expect(result.warning).toContain('STEAM_API_KEY is not configured');
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
});
