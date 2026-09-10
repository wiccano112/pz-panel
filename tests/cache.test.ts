import { describe, it, expect, vi } from 'vitest';
import { getOrSetCache, invalidateCache } from '@/lib/cache';

describe('cache - In-Memory TTL Cache', () => {
  it('should cache and return data without invoking fetcher again within TTL', async () => {
    const fetcher = vi.fn().mockResolvedValue({ status: 'ok' });

    invalidateCache('test_key');
    const firstCall = await getOrSetCache('test_key', 1000, fetcher);
    const secondCall = await getOrSetCache('test_key', 1000, fetcher);

    expect(firstCall).toEqual({ status: 'ok' });
    expect(secondCall).toEqual({ status: 'ok' });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('should re-fetch after cache invalidation', async () => {
    const fetcher = vi.fn().mockResolvedValue('value_1');
    await getOrSetCache('invalidate_key', 1000, fetcher);

    invalidateCache('invalidate_key');

    fetcher.mockResolvedValue('value_2');
    const result = await getOrSetCache('invalidate_key', 1000, fetcher);

    expect(result).toBe('value_2');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
