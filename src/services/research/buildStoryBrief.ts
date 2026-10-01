import { extractJson } from "@/lib/ai/extractJson";
import { BUILD_STORY_BRIEF_PROMPT } from "@/constant/researchPrompts";
import gemini from "@/services/ai/gemini";
import {
  ProductStoryBrief,
  ResearchClaim,
  ResearchInput,
  ResearchSource,
  TrendType,
} from "@/types/research";
import { formatSources } from "./searchSources";
import { verifiedFacts } from "./assessQuality";

const VALID_TREND_TYPES: TrendType[] = [
  "sports_event",
  "music_release",
  "tour",
  "film_tv",
  "celebrity",
  "viral_moment",
  "franchise",
  "brand",
  "generic",
];

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 10);
}

/**
 * Step 7. The brief is deliberately filtered against the deterministic claim
 * statuses: disputed and unverified material is passed in for transparency but
 * is instructed out of `verifiedFacts`, so the writer cannot reach it by
 * accident.
 */
export async function buildStoryBrief({
  input,
  topic,
  event,
  season,
  entities,
  claims,
  sources,
  trendType,
  geminiApiKey,
}: {
  input: ResearchInput;
  topic: string;
  event?: string;
  season?: string;
  entities: string[];
  claims: ResearchClaim[];
  sources: ResearchSource[];
  trendType: TrendType;
  geminiApiKey?: string;
}): Promise<ProductStoryBrief | null> {
  const facts = verifiedFacts(claims);

  if (!facts.length) {
    // No independently confirmed fact means there is no story to tell. Returning
    // null routes the product to the conservative description path rather than
    // letting a brief be assembled from unverified material.
    return null;
  }

  const otherClaims = claims
    .filter((claim) => !(claim.claimType === "fact" && claim.status === "verified"))
    .map((claim) => `- [${claim.status}/${claim.claimType}] ${claim.claim}`)
    .join("\n");

  const prompt = BUILD_STORY_BRIEF_PROMPT.replaceAll("{{productName}}", input.productName)
    .replaceAll("{{topic}}", topic || "(unclear)")
    .replaceAll("{{event}}", event || "(unclear)")
    .replaceAll("{{season}}", season || "(none)")
    .replaceAll("{{entities}}", entities.join(", ") || "(none)")
    .replaceAll("{{verifiedFacts}}", facts.map((fact) => `- ${fact}`).join("\n"))
    .replaceAll("{{otherClaims}}", otherClaims || "(none)")
    .replaceAll("{{sources}}", formatSources(sources));

  const content = await gemini(prompt, geminiApiKey);
  const parsed = extractJson<Record<string, unknown>>(content);

  const briefVerifiedFacts = asStringList(parsed.verifiedFacts);
  const context = asString(parsed.context);

  if (!context) {
    return null;
  }

  return {
    topic: asString(parsed.topic) || topic || input.productName,
    trendType: VALID_TREND_TYPES.includes(parsed.trendType as TrendType)
      ? (parsed.trendType as TrendType)
      : trendType,
    event: asString(parsed.event) || event,
    season: asString(parsed.season) || season,
    breaking: parsed.breaking === true,
    context,
    significance: asString(parsed.significance),
    fanAngle: asString(parsed.fanAngle),
    entities: asStringList(parsed.entities).length
      ? asStringList(parsed.entities)
      : entities,
    // The model's list is intersected with what the verifier confirmed, so a
    // brief can never widen the evidence set.
    verifiedFacts: briefVerifiedFacts.filter((fact) => facts.includes(fact)).length
      ? briefVerifiedFacts.filter((fact) => facts.includes(fact))
      : facts,
    searchIntent: asStringList(parsed.searchIntent).slice(0, 4),
    contentAngle: asString(parsed.contentAngle),
    confidence:
      typeof parsed.confidence === "number"
        ? Math.max(0, Math.min(1, parsed.confidence))
        : 0.5,
  };
}
