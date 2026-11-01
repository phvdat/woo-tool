import { RawSpyProduct, SpyCompetitor } from "@/types/product-spy";

/**
 * A baseline crawl must never look like a fresh discovery. Products without a
 * usable historical date are filed under this sentinel instead of "now".
 */
export const BASELINE_FALLBACK_FIRST_SEEN_AT = "2000-01-01T00:00:00.000Z";

const BASELINE_MIN_AGE_MS = 24 * 60 * 60 * 1000;

export function needsBaseline(
  competitor: Pick<SpyCompetitor, "baselineStatus">
): boolean {
  return competitor.baselineStatus === "new";
}

/**
 * Prefer the product's real historical date when it is old enough to be
 * unambiguously pre-baseline. Anything recent, future, or unparseable falls
 * back to the sentinel so it cannot show up in today's "new products" view.
 */
export function baselineFirstSeenAt(
  product: Pick<RawSpyProduct, "dateCreated">,
  crawlStartedAt: Date | string | number
): string {
  const startMs = new Date(crawlStartedAt).getTime();
  const raw = product.dateCreated;

  if (raw) {
    const createdMs = Date.parse(raw);
    if (
      Number.isFinite(createdMs) &&
      Number.isFinite(startMs) &&
      createdMs < startMs - BASELINE_MIN_AGE_MS
    ) {
      return new Date(createdMs).toISOString();
    }
  }

  return BASELINE_FALLBACK_FIRST_SEEN_AT;
}

export function canCompleteBaseline(
  products: readonly unknown[],
  complete: boolean | undefined
): boolean {
  return products.length > 0 && complete !== false;
}
