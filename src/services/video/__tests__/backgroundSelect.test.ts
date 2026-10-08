import { describe, expect, it } from 'vitest';
import { selectBackgroundForVideo } from '../backgroundSelect';

describe('selectBackgroundForVideo', () => {
  it('falls back to the default background when the pool is empty', () => {
    expect(selectBackgroundForVideo(0)).toBe(-1);
    expect(selectBackgroundForVideo(-3)).toBe(-1);
  });

  it('always picks an index inside the pool range', () => {
    for (let i = 0; i < 50; i++) {
      const pick = selectBackgroundForVideo(4);
      expect(pick).toBeGreaterThanOrEqual(0);
      expect(pick).toBeLessThan(4);
    }
  });

  it('is deterministic for a given rng', () => {
    expect(selectBackgroundForVideo(5, () => 0)).toBe(0);
    expect(selectBackgroundForVideo(5, () => 0.5)).toBe(2);
  });

  it('clamps a single-image pool to index 0', () => {
    expect(selectBackgroundForVideo(1, () => 0.99)).toBe(0);
  });

  it('stays in range even if the rng returns 1', () => {
    expect(selectBackgroundForVideo(3, () => 1)).toBe(2);
  });
});
