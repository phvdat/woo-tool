import { describe, expect, it } from 'vitest';
import { computeThumbnailProductBox } from '../thumbnail';
import { VIDEO_CONFIG } from '../config';

describe('computeThumbnailProductBox', () => {
  const W = 1080;
  const H = 1920;

  it('keeps the product inside the configured small footprint', () => {
    const box = computeThumbnailProductBox(1000, 1400, W, H);
    expect(box.width).toBeLessThanOrEqual(
      Math.floor(W * VIDEO_CONFIG.THUMBNAIL_PRODUCT_MAX_WIDTH_RATIO)
    );
    expect(box.height).toBeLessThanOrEqual(
      Math.floor(H * VIDEO_CONFIG.THUMBNAIL_PRODUCT_MAX_HEIGHT_RATIO)
    );
  });

  it('preserves the original aspect ratio', () => {
    const box = computeThumbnailProductBox(1600, 900, W, H);
    expect(Math.abs(box.width / box.height - 1600 / 900)).toBeLessThan(0.01);
  });

  it('insets the product from the top and left edges', () => {
    const padding = Math.round(W * VIDEO_CONFIG.THUMBNAIL_PADDING_RATIO);
    const box = computeThumbnailProductBox(800, 800, W, H);
    expect(padding).toBeGreaterThan(0);
    expect(box.top).toBe(padding);
    expect(box.left).toBe(padding);
  });

  it('enlarges images smaller than the footprint', () => {
    const box = computeThumbnailProductBox(100, 100, W, H);
    expect(box.width).toBeGreaterThan(100);
    expect(box.height).toBeGreaterThan(100);
  });

  it('never produces a zero-sized box', () => {
    const box = computeThumbnailProductBox(1, 4000, W, H);
    expect(box.width).toBeGreaterThanOrEqual(1);
    expect(box.height).toBeGreaterThanOrEqual(1);
  });
});
