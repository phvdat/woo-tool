import { QUALITY_BANDS, RESEARCH_LIMITS, SOURCE_TIER_WEIGHTS } from "@/constant/research";
import { ResearchClaim, ResearchQuality, ResearchSource, ResearchTopic } from "@/types/research";
import { independentConfirmations, buildSourceIndex } from "./sourceTiers";

type DimensionKey = keyof ResearchQuality["dimensions"];

const WEIGHTS: Record<DimensionKey, number> = {
  entityIdentification: 0.15,
  storyIdentification: 0.2,
  sourceQuality: 0.25,
  factVerification: 0.25,
  currentRelevance: 0.08,
  searchIntent: 0.07,
};

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function scoreEntityIdentification(topic: ResearchTopic): number {
  const count = topic.entities.length;
  if (!count) {
    return 0;
  }
  return clamp(count / 2);
}

function scoreStoryIdentification(topic: ResearchTopic): number {
  const brief = topic.storyBrief;
  if (!brief) {
    return 0;
  }

  let score = 0.35;
  if (brief.event) score += 0.25;
  if (brief.context && brief.context.length >= 40) score += 0.2;
  if (brief.contentAngle) score += 0.2;

  return clamp(score);
}

function scoreSourceQuality(topic: ResearchTopic): number {
  if (!topic.sources.length) {
    return 0;
  }

  const bestWeight = Math.max(
    ...topic.sources.map((source) => SOURCE_TIER_WEIGHTS[source.tier]),
  );
  const primaryCount = topic.sources.filter((source) => source.tier === 1).length;
  const breadth = clamp(topic.sources.length / RESEARCH_LIMITS.MAX_SOURCES);

  // Tier depth dominates; breadth only breaks ties between two strong sets.
  return clamp(bestWeight * 0.7 + breadth * 0.3 + (primaryCount > 0 ? 0.15 : 0));
}

function scoreFactVerification(topic: ResearchTopic): number {
  const facts = topic.claims.filter((claim) => claim.claimType === "fact");
  if (!facts.length) {
    return 0;
  }

  const sourcesById = buildSourceIndex(topic.sources);

  let weighted = 0;
  let possible = 0;

  for (const claim of facts) {
    const importanceWeight = claim.importance === "high" ? 3 : claim.importance === "medium" ? 2 : 1;
    possible += importanceWeight;
    if (claim.status === "disputed") {
      continue;
    }
    const { count } = independentConfirmations(claim.sources, sourcesById);
    weighted += importanceWeight * clamp(count / 2);
  }

  return possible ? clamp(weighted / possible) : 0;
}

function scoreCurrentRelevance(topic: ResearchTopic): number {
  if (!topic.researchedAt) {
    return 0;
  }

  const researchedAt = Date.parse(topic.researchedAt);
  if (Number.isNaN(researchedAt)) {
    return 0;
  }

  const ageHours = (Date.now() - researchedAt) / 3_600_000;
  if (ageHours <= 24) return 1;
  if (ageHours <= 72) return 0.8;
  if (ageHours <= 336) return 0.55;
  if (ageHours <= 1440) return 0.3;
  return 0.1;
}

function scoreSearchIntent(topic: ResearchTopic): number {
  const intent = topic.storyBrief?.searchIntent || [];
  return clamp(intent.length / 4);
}

function countPenalties(topic: ResearchTopic): string[] {
  const penalties: string[] = [];

  if (!topic.entities.length) {
    penalties.push("No entity was identified from the product title");
  }

  const disputed = topic.claims.filter((claim) => claim.status === "disputed");
  if (disputed.length) {
    penalties.push(`${disputed.length} claim(s) are disputed by their sources`);
  }

  const unverifiedFacts = topic.claims.filter(
    (claim) => claim.claimType === "fact" && claim.status !== "verified",
  );
  if (unverifiedFacts.length) {
    penalties.push(`${unverifiedFacts.length} factual claim(s) lack independent confirmation`);
  }

  const signalOnly = topic.claims.filter((claim) => claim.claimType === "social_signal");
  if (signalOnly.length && !topic.claims.some((claim) => claim.claimType === "fact")) {
    penalties.push("Only social/community signals were found, no primary facts");
  }

  // `[].every(...)` is vacuously true, so a topic with no sources at all would
  // otherwise be reported as if it had found only Tier 3 evidence.
  if (topic.sources.length > 0 && topic.sources.every((source) => source.tier === 3)) {
    penalties.push("All sources are Tier 3 community/social");
  }

  if (topic.sources.length < 2) {
    penalties.push("Fewer than 2 sources were retained");
  }

  return penalties;
}

function bandFor(score: number): ResearchQuality["band"] {
  if (score >= QUALITY_BANDS.FULL) return "full";
  if (score >= QUALITY_BANDS.VERIFIED_ONLY) return "verified_only";
  if (score >= QUALITY_BANDS.RETRY) return "retry";
  return "fallback";
}

/**
 * Deterministic research quality. Every dimension is derived from observable
 * evidence — source tiers, independent domains, verified claim counts, entity
 * and event identification, conflicts. `topic.llmConfidence` is stored but is
 * deliberately not an input: a model cannot raise its own score past what the
 * evidence supports.
 */
export function assessQuality(topic: ResearchTopic): ResearchQuality {
  const dimensions: ResearchQuality["dimensions"] = {
    entityIdentification: scoreEntityIdentification(topic),
    storyIdentification: scoreStoryIdentification(topic),
    sourceQuality: scoreSourceQuality(topic),
    factVerification: scoreFactVerification(topic),
    currentRelevance: scoreCurrentRelevance(topic),
    searchIntent: scoreSearchIntent(topic),
  };

  const weighted = (Object.keys(WEIGHTS) as DimensionKey[]).reduce(
    (total, key) => total + dimensions[key] * WEIGHTS[key],
    0,
  );

  const penalties = countPenalties(topic);

  // Conflicting evidence is a hard deduction rather than a dimension: a topic
  // can have good sources and still be untrustworthy.
  const conflictPenalty = penalties.some((penalty) => penalty.includes("disputed"))
    ? 0.12
    : 0;

  const score = Math.round(clamp(weighted - conflictPenalty) * 100);

  return {
    score,
    band: bandFor(score),
    dimensions,
    penalties,
  };
}

export function verifiedFacts(claims: ResearchClaim[]): string[] {
  return claims
    .filter(
      (claim) =>
        claim.claimType === "fact" &&
        claim.status === "verified" &&
        claim.confidence >= 0.6,
    )
    .map((claim) => claim.claim);
}

export function usableSources(topic: Pick<ResearchTopic, "sources">): ResearchSource[] {
  return topic.sources.filter((source) => !source.isSnippetOnly);
}
