class AsyncLock {
  private queue: Array<() => void> = [];
  private locked = false;

  async acquire(): Promise<() => void> {
    return new Promise((resolve) => {
      const run = () => {
        this.locked = true;
        resolve(() => {
          this.locked = false;
          if (this.queue.length > 0) {
            const next = this.queue.shift();
            if (next) next();
          }
        });
      };

      if (this.locked) {
        this.queue.push(run);
      } else {
        run();
      }
    });
  }
}

const fileLocks = new Map<string, AsyncLock>();

export async function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  let lock = fileLocks.get(key);
  if (!lock) {
    lock = new AsyncLock();
    fileLocks.set(key, lock);
  }

  const release = await lock.acquire();
  try {
    return await fn();
  } finally {
    release();
  }
}
