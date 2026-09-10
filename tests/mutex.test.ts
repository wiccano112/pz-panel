import { describe, it, expect } from 'vitest';
import { withLock } from '@/lib/mutex';

describe('mutex - File Concurrency & Lock Management', () => {
  it('should serialize concurrent operations with the same lock key', async () => {
    const executionOrder: number[] = [];

    const task1 = withLock('file_a', async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      executionOrder.push(1);
      return 'task1_done';
    });

    const task2 = withLock('file_a', async () => {
      executionOrder.push(2);
      return 'task2_done';
    });

    const [res1, res2] = await Promise.all([task1, task2]);

    expect(res1).toBe('task1_done');
    expect(res2).toBe('task2_done');
    expect(executionOrder).toEqual([1, 2]);
  });

  it('should allow concurrent execution for different lock keys', async () => {
    const startTimes: Record<string, number> = {};
    const finishTimes: Record<string, number> = {};

    const taskA = withLock('file_key_1', async () => {
      startTimes.a = Date.now();
      await new Promise((resolve) => setTimeout(resolve, 50));
      finishTimes.a = Date.now();
    });

    const taskB = withLock('file_key_2', async () => {
      startTimes.b = Date.now();
      await new Promise((resolve) => setTimeout(resolve, 50));
      finishTimes.b = Date.now();
    });

    await Promise.all([taskA, taskB]);

    // Both should start nearly simultaneously (within 25ms)
    expect(Math.abs(startTimes.a - startTimes.b)).toBeLessThan(25);
  });

  it('should release the lock even when the task throws an error', async () => {
    await expect(
      withLock('error_lock', async () => {
        throw new Error('Operation crashed');
      })
    ).rejects.toThrow('Operation crashed');

    // The lock should be freed and the next task should succeed
    const subsequentTask = await withLock('error_lock', async () => {
      return 'recovered';
    });

    expect(subsequentTask).toBe('recovered');
  });
});
