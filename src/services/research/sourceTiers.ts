import {
  COMMUNITY_HOSTS,
  GENERIC_NEWS_OUTLETS,
  OFFICIAL_HOST_MARKERS,
  RESEARCH_LIMITS,
  SOURCE_TIER_WEIGHTS,
  TITLE_STOPWORDS,
  TIER1_OFFICIAL_ROOTS,
  TREND_NEWS_OUTLETS,
  UNKNOWN_SOURCE_WEIGHT,
} from "@/constant/research";
import { GroundedSource } from "@/services/ai/gemini";
import {
  ResearchClaim,
  ResearchEntity,
  ResearchSource,
  SourceTier,
  SourceType,
  TrendType,
} from "@/types/research";
import { registrableDomain, substantiveTokens } from "./topicKey";

export interface ClassifiedSource {
  id: string;
  url: string;
  title: string;
  sourceName: string;
  sourceType: SourceType;
  tier: SourceTier;
  relevance: number;
  isSnippetOnly: boolean;
  domain: string;
}

function matchesHost(host: string, roots: readonly string[]): boolean {
  return roots.some((root) => host === root || host.endsWith(`.${root}`));
}

/**
 * Suffix markers (`.gov`) match anywhere in the host; word markers must be a
 * complete label, so `officialsports.example` is not treated as official while
 * `official.example` and `league.example` are.
 */
function matchesHostMarker(host: string, marker: string): boolean {
  if (marker.startsWith(".")) {
    return host.endsWith(marker);
  }
  return host.split(".").includes(marker);
}

function isCommunityHost(host: string): boolean {
  return COMMUNITY_HOSTS.some(
    (root) => host === root || host.endsWith(`.${root}`),
  );
}

function isKnownOutlet(host: string, trendType: TrendType): boolean {
  const trendOutlets =
    (TREND_NEWS_OUTLETS[trendType] as readonly string[] | undefined) || [];

  return (
    GENERIC_NEWS_OUTLETS.some(
      (root) => host === root || host.endsWith(`.${root}`),
    ) ||
    matchesHost(host, trendOutlets)
  );
}

function squashed(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const COMMERCIAL_HOST_HINTS = [
  "shop",
  "store",
  "merch",
  "boutique",
  "ecommerce",
  "ebay",
  "etsy",
  "amazon",
  "walmart",
  "aliexpress",
  "temu",
  "shopify",
  "poshmark",
  "depop",
  "redbubble",
  "zazzle",
  "teepublic",
];

/**
 * Official-signal detection is generic on purpose: a domain counts as official
 * when it carries one of the researched entity names, when it is a recognised
 * governing body for the detected trend, or when the host advertises itself as
 * one. Nothing here assumes the catalog is sports. Retail/marketplace hosts are
 * excluded so a shop named after the subject is never mistaken for a primary
 * source.
 */
function isOfficialSignal(
  host: string,
  entities: ResearchEntity[],
  trendType: TrendType,
): boolean {
  if (!host) {
    return false;
  }

  if (COMMERCIAL_HOST_HINTS.some((hint) => host.includes(hint))) {
    return false;
  }

  const officialRoots =
    (TIER1_OFFICIAL_ROOTS[trendType] as readonly string[] | undefined) || [];

  if (matchesHost(host, officialRoots)) {
    return true;
  }

  if (OFFICIAL_HOST_MARKERS.some((marker) => matchesHostMarker(host, marker))) {
    return true;
  }

  const hostSquashed = squashed(host.split(".").slice(0, -1).join(" "));

  return entities.some((entity) => {
    const entitySquashed = squashed(entity.name);
    return entitySquashed.length >= 4 && hostSquashed.startsWith(entitySquashed);
  });
}

export interface Authority {
  sourceType: SourceType;
  tier: SourceTier;
  relevance: number;
}

/**
 * Authority is resolved from the domain alone so it can be recomputed cheaply
 * once the model has told us the real trend type — outlet reputation is
 * topic-specific, and the preliminary hint is only a guess.
 */
export function resolveAuthority(
  url: string,
  entities: ResearchEntity[],
  trendType: TrendType,
): Authority {
  const domain = registrableDomain(url);
  const host = url.replace(/^https?:\/\//, "").split("/")[0].toLowerCase();

  if (isCommunityHost(domain)) {
    return {
      sourceType: domain.includes("reddit") || domain.includes("fandom") ? "community" : "social",
      tier: 3,
      relevance: 0.4,
    };
  }

  if (isKnownOutlet(domain, trendType)) {
    return { sourceType: "news", tier: 2, relevance: 0.7 };
  }

  if (
    isOfficialSignal(host, entities, trendType) ||
    isOfficialSignal(domain, entities, trendType)
  ) {
    return { sourceType: "official", tier: 1, relevance: 0.9 };
  }

  return { sourceType: "other", tier: 2, relevance: 0.7 };
}

export function classifySource(
  raw: GroundedSource,
  entities: ResearchEntity[],
  trendType: TrendType,
  index: number,
): ClassifiedSource {
  const authority = resolveAuthority(raw.url, entities, trendType);

  return {
    id: `s${index + 1}`,
    url: raw.url,
    title: raw.title,
    sourceName: registrableDomain(raw.url) || raw.domain,
    ...authority,
    isSnippetOnly: false,
    domain: registrableDomain(raw.url) || raw.domain,
  };
}

export function toResearchSource(source: ClassifiedSource): ResearchSource {
  return {
    id: source.id,
    url: source.url,
    title: source.title,
    sourceName: source.sourceName,
    sourceType: source.sourceType,
    tier: source.tier,
    relevance: source.relevance,
    isSnippetOnly: source.isSnippetOnly,
  };
}

/** Order by authority first, then by the structural relevance above. */
export function selectUsefulSources(sources: ClassifiedSource[]): ClassifiedSource[] {
  return [...sources]
    .sort((a, b) => a.tier - b.tier || b.relevance - a.relevance)
    .filter((source) => source.relevance >= RESEARCH_LIMITS.MIN_SOURCE_RELEVANCE)
    .slice(0, RESEARCH_LIMITS.MAX_SOURCES);
}

export function normalizeTitle(title: string): string {
  return substantiveTokens(title)
    .filter((token) => !TITLE_STOPWORDS.includes(token))
    .sort()
    .join(" ");
}

export function sourceWeight(source: ResearchSource): number {
  if (source.isSnippetOnly) {
    return 0;
  }
  if (source.tier === 1) {
    return SOURCE_TIER_WEIGHTS[1];
  }
  if (source.tier === 2) {
    return source.sourceType === "other" ? UNKNOWN_SOURCE_WEIGHT : SOURCE_TIER_WEIGHTS[2];
  }
  return SOURCE_TIER_WEIGHTS[3];
}

/**
 * Independent confirmation, per §6: distinct registrable domains only, with
 * normalized-title matching so a syndicated copy on a second outlet does not
 * read as corroboration. Snippet-only and Tier 3 sources carry no weight.
 */
export function independentConfirmations(
  sourceIds: string[],
  sourcesById: Map<string, ResearchSource>,
): { domains: string[]; weight: number; count: number } {
  const seenTitles = new Set<string>();
  const domains = new Set<string>();
  let weight = 0;

  for (const id of sourceIds) {
    const source = sourcesById.get(id);
    if (!source) {
      continue;
    }

    if (source.isSnippetOnly || source.tier === 3) {
      continue;
    }

    const titleKey = normalizeTitle(source.title);
    if (titleKey && seenTitles.has(titleKey)) {
      continue;
    }
    if (titleKey) {
      seenTitles.add(titleKey);
    }

    const domain = registrableDomain(source.url) || source.sourceName;
    if (domains.has(domain)) {
      continue;
    }

    domains.add(domain);
    weight += sourceWeight(source);
  }

  return { domains: Array.from(domains), weight, count: domains.size };
}

export function confidenceFromWeight(weight: number): number {
  if (weight <= 0) {
    return 0;
  }
  // 1 source at full weight ≈ 0.55, 2 independent strong sources ≈ 0.85
  return Math.min(0.98, Math.round((1 - Math.exp(-1.2 * weight)) * 100) / 100);
}

export function buildSourceIndex(sources: ResearchSource[]): Map<string, ResearchSource> {
  return new Map(sources.map((source) => [source.id, source]));
}

export function resolveSourceIds(
  references: string[],
  sources: ResearchSource[],
): string[] {
  const byUrl = new Map(sources.map((source) => [source.url, source.id]));
  const byId = new Set(sources.map((source) => source.id));
  const resolved: string[] = [];

  for (const reference of references) {
    const trimmed = (reference || "").trim();
    if (!trimmed) {
      continue;
    }
    if (byId.has(trimmed)) {
      resolved.push(trimmed);
      continue;
    }
    if (byUrl.has(trimmed)) {
      resolved.push(byUrl.get(trimmed)!);
      continue;
    }
    const loose = sources.find(
      (source) => source.url.includes(trimmed) || trimmed.includes(source.url),
    );
    if (loose) {
      resolved.push(loose.id);
    }
  }

  return Array.from(new Set(resolved));
}

export function hasDisputedClaim(claims: ResearchClaim[]): boolean {
  return claims.some((claim) => claim.status === "disputed");
}
