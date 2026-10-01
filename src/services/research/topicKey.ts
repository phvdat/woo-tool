import slugify from "slugify";
import { APPAREL_KEYWORDS } from "@/constant/apparel";
import {
  ACTIVE_TREND_TYPES,
  FRESHNESS_MS,
  GENERIC_PRODUCT_TOKENS,
  SEASONAL_TREND_TYPES,
  TWO_PART_PUBLIC_SUFFIXES,
} from "@/constant/research";
import { ResearchEntity, TrendType } from "@/types/research";

const GENERIC_TOKENS = [
  ...GENERIC_PRODUCT_TOKENS,
  ...APPAREL_KEYWORDS,
];

function tokenize(value: string): string[] {
  return value
    .replace(/[’']/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

export function substantiveTokens(value: string): string[] {
  const tokens = tokenize(value);
  return tokens.filter((token) => {
    if (GENERIC_TOKENS.includes(token)) {
      return false;
    }
    // "tshirt"/"t-shirt" and friends survive as short fragments of generic words
    return token.length > 2;
  });
}

/**
 * Identity *before* research: entities plus whatever year the title states.
 * Two different events can share this key, which is why it is treated as a
 * provisional pointer and re-resolved into `buildTopicKey` afterwards.
 */
export function buildProvisionalTopicKey(
  entities: ResearchEntity[],
  year?: string,
): string {
  const parts = entities
    .map((entity) => entity.name)
    .filter(Boolean)
    .flatMap((name) => substantiveTokens(name));

  const yearToken = year ? tokenize(year).find((t) => /^\d{4}$/.test(t)) : undefined;

  const unique = Array.from(new Set([...parts, ...(yearToken ? [yearToken] : [])]));

  if (!unique.length) {
    return "";
  }

  return slugify(unique.join(" "), { lower: true, strict: true });
}

/**
 * Identity *after* research: the same entities plus the specific event/topic and
 * season that grounded sources confirmed. Two products about different events
 * involving the same people land on different keys.
 */
export function buildTopicKey({
  entities,
  event,
  season,
}: {
  entities: ResearchEntity[];
  event?: string;
  season?: string;
}): string {
  const entityTokens = entities
    .map((entity) => entity.name)
    .flatMap((name) => substantiveTokens(name));

  const eventTokens = event ? substantiveTokens(event).slice(0, 4) : [];
  const seasonToken = season
    ? tokenize(season).find((t) => /^\d{4}$/.test(t))
    : undefined;

  const unique = Array.from(
    new Set([
      ...entityTokens,
      ...(seasonToken ? [seasonToken] : []),
      ...eventTokens,
    ]),
  );

  if (!unique.length) {
    return buildProvisionalTopicKey(entities, seasonToken);
  }

  return slugify(unique.join(" "), { lower: true, strict: true });
}

export function resolveFreshnessMs(
  trendType: TrendType,
  breaking?: boolean,
): number {
  if (breaking) {
    return FRESHNESS_MS.breaking;
  }

  if ((ACTIVE_TREND_TYPES as readonly string[]).includes(trendType)) {
    return FRESHNESS_MS.active_trend;
  }

  if ((SEASONAL_TREND_TYPES as readonly string[]).includes(trendType)) {
    return FRESHNESS_MS.seasonal;
  }

  return FRESHNESS_MS.evergreen;
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

/**
 * Registrable domain, e.g. `bbc.co.uk`. Independent-source counting depends on
 * this, so two articles on the same publisher collapse to one confirmation.
 */
export function registrableDomain(url: string): string {
  const host = hostOf(url);
  if (!host) {
    return "";
  }

  const labels = host.split(".");
  if (labels.length <= 2) {
    return host;
  }

  const lastTwo = labels.slice(-2).join(".");

  if (TWO_PART_PUBLIC_SUFFIXES.includes(lastTwo)) {
    return labels.slice(-3).join(".");
  }

  return lastTwo;
}
