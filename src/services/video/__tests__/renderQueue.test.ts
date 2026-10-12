import { describe, expect, it } from 'vitest';
import { createRenderQueue } from '../renderQueue';

function claimer(items: string[]) {
  const remaining = [...items];
  return {
    claimNext: async (): Promise<string | null> =>
      remaining.length > 0 ? remaining.shift()! : null,
  };
}

async function waitUntil(predicate: () => boolean, timeoutMs = 2000) {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error('waitUntil timed out');
    }
    await new Promise((resolve) => setTimeout(resolve, 1));
  }
}

describe('createRenderQueue', () => {
  it('never renders more than one job at a time across all websites', async () => {
    const jobs = ['site-a:1', 'site-b:1', 'site-a:2', 'site-c:1'];
    const { claimNext } = claimer(jobs);
    let active = 0;
    let maxActive = 0;
    const order: string[] = [];

    const queue = createRenderQueue<string>({
      concurrency: 1,
      claimNext,
      run: async (job) => {
        active++;
        maxActive = Math.max(maxActive, active);
        await new Promise((resolve) => setTimeout(resolve, 5));
        order.push(job);
        active--;
      },
    });

    await queue.pump();
    await waitUntil(() => order.length === jobs.length);

    expect(maxActive).toBe(1);
    expect(order).toEqual(jobs);
  });

  it('claims jobs in order and never claims the same job twice', async () => {
    const jobs = ['a', 'b', 'c', 'd'];
    const claimed: string[] = [];
    const runs: string[] = [];

    const queue = createRenderQueue<string>({
      concurrency: 1,
      claimNext: async () => {
        if (jobs.length === 0) return null;
        const item = jobs.shift()!;
        claimed.push(item);
        return item;
      },
      run: async (job) => {
        runs.push(job);
        await new Promise((resolve) => setTimeout(resolve, 1));
      },
    });

    await queue.pump();
    await waitUntil(() => runs.length === 4);

    expect(claimed).toEqual(['a', 'b', 'c', 'd']);
    expect(runs).toEqual(['a', 'b', 'c', 'd']);
    expect(new Set(runs).size).toBe(runs.length);
  });

  it('does not re-enter claimNext while a claim is in flight', async () => {
    const jobs = ['a', 'b', 'c'];
    let claiming = false;
    let overlap = false;

    const queue = createRenderQueue<string>({
      concurrency: 1,
      claimNext: async () => {
        if (claiming) overlap = true;
        claiming = true;
        await new Promise((resolve) => setTimeout(resolve, 2));
        claiming = false;
        return jobs.shift() ?? null;
      },
      run: async () => {
        await new Promise((resolve) => setTimeout(resolve, 1));
      },
    });

    await Promise.all([queue.pump(), queue.pump(), queue.pump()]);
    await waitUntil(() => queue.activeCount() === 0 && jobs.length === 0);

    expect(overlap).toBe(false);
  });

  it('keeps processing after a job fails', async () => {
    const { claimNext } = claimer(['a', 'b', 'c']);
    const runs: string[] = [];

    const queue = createRenderQueue<string>({
      concurrency: 1,
      claimNext,
      run: async (job) => {
        runs.push(job);
        if (job === 'b') throw new Error('render exploded');
      },
    });

    await queue.pump();
    await waitUntil(() => runs.length === 3 && queue.activeCount() === 0);

    expect(runs).toEqual(['a', 'b', 'c']);
  });

  it('picks up work enqueued while a job is already running', async () => {
    const jobs: string[] = ['a'];
    let releaseA: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      releaseA = resolve;
    });
    const runs: string[] = [];

    const queue = createRenderQueue<string>({
      concurrency: 1,
      claimNext: async () => (jobs.length > 0 ? jobs.shift()! : null),
      run: async (job) => {
        runs.push(job);
        if (job === 'a') await gate;
        await new Promise((resolve) => setTimeout(resolve, 1));
      },
    });

    await queue.pump();
    jobs.push('b', 'c');
    await Promise.all([queue.pump(), queue.pump()]);

    expect(runs).toEqual(['a']);

    releaseA();
    await waitUntil(() => runs.length === 3);

    expect(runs).toEqual(['a', 'b', 'c']);
  });
});
