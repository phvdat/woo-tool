import type { RawSpyProduct } from "@/types/product-spy";

/**
 * Stable identity for one product inside one competitor.
 *
 * The old checker compared a lowercase/trailing-slash-stripped URL and the
 * adapter `externalId` in a separate read before inserting. That is a
 * read-then-write race, so two overlapping checks both saw "not found" and
 * inserted the same product. Everything here is derived purely from the
 * adapter payload; `dedupeKey` is what the unique index / upsert relies on.
 */
export interface SpyProductIdentity {
  externalId?: string;
  normalizedUrl?: string;
  dedupeKey: string;
}

export function normalizeSpyExternalId(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;

  const id = String(value).trim();
  return id.length > 0 ? id : undefined;
}

export function normalizeSpyUrl(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;

  const raw = String(value).trim();
  if (!raw) return undefined;

  let url = raw.split("#")[0];
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    url = parsed.href;
  } catch {
    // Adapters should return absolute URLs, but keep the old behaviour for
    // anything malformed instead of dropping the product.
  }

  const normalized = url.toLowerCase().replace(/\/+$/, "");
  return normalized.length > 0 ? normalized : undefined;
}

export function buildSpyProductIdentity(
  product: RawSpyProduct,
): SpyProductIdentity {
  const externalId = normalizeSpyExternalId(product.externalId);
  const normalizedUrl =
    normalizeSpyUrl(product.url) ?? normalizeSpyUrl(product.normalizedUrl);

  let dedupeKey: string;
  if (normalizedUrl) {
    dedupeKey = `url:${normalizedUrl}`;
  } else if (externalId) {
    dedupeKey = `id:${externalId}`;
  } else {
    const title = String(product.title || "").trim().toLowerCase();
    const price = String(product.price || "").trim();
    dedupeKey = `title:${title}|${price}`;
  }

  return { externalId, normalizedUrl, dedupeKey };
}

/**
 * Mongo filter for the atomic upsert. `dedupeKey` is included so a second run
 * also matches rows written by the new code even if the URL/external id shape
 * changed slightly, while the old fields keep existing rows matchable.
 */
export function buildSpyProductMatch(
  competitorId: unknown,
  identity: SpyProductIdentity,
): Record<string, unknown> {
  const matches: Record<string, unknown>[] = [{ dedupeKey: identity.dedupeKey }];

  if (identity.externalId) {
    matches.push({ externalId: identity.externalId });
  }
  if (identity.normalizedUrl) {
    matches.push({ normalizedUrl: identity.normalizedUrl });
  }

  return { competitorId, $or: matches };
}
