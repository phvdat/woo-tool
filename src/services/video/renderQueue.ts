export interface RenderQueueOptions<T> {
  concurrency: number;
  claimNext: () => Promise<T | null>;
  run: (item: T) => Promise<void>;
  onError?: (error: unknown, item: T) => void;
}

export interface RenderQueue<T> {
  pump: () => Promise<void>;
  activeCount: () => number;
}

/**
 * A single shared worker pool. `pump()` fills free slots by claiming work via
 * the caller-supplied atomic `claimNext`, but never concurrently: at most
 * `concurrency` `run`s are in flight and `claimNext` is never re-entered.
 * Each finished (or failed) run frees its slot and pumps again, so a thrown
 * job never stalls the queue.
 */
export function createRenderQueue<T>({
  concurrency,
  claimNext,
  run,
  onError,
}: RenderQueueOptions<T>): RenderQueue<T> {
  const limit = Math.max(1, concurrency);
  let active = 0;
  let pumping = false;
  let rerun = false;

  async function pump(): Promise<void> {
    if (pumping) {
      rerun = true;
      return;
    }
    pumping = true;
    try {
      do {
        rerun = false;
        while (active < limit) {
          const item = await claimNext();
          if (item === null) break;
          active++;
          Promise.resolve()
            .then(() => run(item))
            .catch((error) => onError?.(error, item))
            .finally(() => {
              active--;
              void pump();
            });
        }
      } while (rerun);
    } finally {
      pumping = false;
    }
  }

  return {
    pump,
    activeCount: () => active,
  };
}
