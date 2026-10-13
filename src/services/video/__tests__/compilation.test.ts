import { describe, expect, it } from 'vitest';
import {
  buildCompilationBatchKey,
  selectCompilationProducts,
  COMPILATION_SIZE,
} from '../compilation';

describe('buildCompilationBatchKey', () => {
  it('is order-independent', () => {
    expect(buildCompilationBatchKey([3, 1, 2])).toBe(
      buildCompilationBatchKey([1, 2, 3])
    );
  });

  it('produces different keys for different product sets', () => {
    const a = buildCompilationBatchKey([1, 2, 3, 4, 5]);
    const b = buildCompilationBatchKey([1, 2, 3, 4, 6]);
    expect(a).not.toBe(b);
  });

  it('accepts string and number ids', () => {
    expect(buildCompilationBatchKey(['10', 2])).toBe('10-2');
  });
});

describe('selectCompilationProducts', () => {
  it('keeps only products with a first image, in order', () => {
    const products = [
      { id: 1, name: 'a', images: [{ src: 'a.jpg' }] },
      { id: 2, name: 'b', images: [] },
      { id: 3, name: 'c', images: [{ src: 'c.jpg' }] },
      { id: 4, name: 'd', images: [{}] },
      { id: 5, name: 'e', images: [{ src: 'e.jpg' }] },
      { id: 6, name: 'f', images: [{ src: 'f.jpg' }] },
    ];

    const selected = selectCompilationProducts(products);
    expect(selected.map((p) => p.id)).toEqual([1, 3, 5, 6]);
    expect(selected).toHaveLength(4);
  });

  it('caps at the requested size', () => {
    const products = Array.from({ length: 9 }, (_, i) => ({
      id: i,
      name: `p${i}`,
      images: [{ src: `${i}.jpg` }],
    }));
    expect(selectCompilationProducts(products)).toHaveLength(COMPILATION_SIZE);
  });
});
