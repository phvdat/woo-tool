import { extractJson } from "@/lib/ai/extractJson";
import { RESEARCH_CONTEXT_PROMPT } from "@/constant/researchPrompts";
import { RESEARCH_LIMITS } from "@/constant/research";
import { geminiGrounded } from "@/services/ai/gemini";
import {
  EntityExtraction,
  ResearchEntity,
  ResearchInput,
  ResearchSource,
  SearchQuery,
  TrendType,
} from "@/types/research";
import {
  ClassifiedSource,
  classifySource,
  selectUsefulSources,
} from "./sourceTiers";

export interface ResearchContextResult {
  summary: string;
  event?: string;
  season?: string;
  breaking: boolean;
  trendType: TrendType;
  entitiesConfirmed: string[];
  context: string;
  significance: string;
  canBeEstablished: boolean;
  reasonIfNot?: string;
  sources: ClassifiedSource[];
  executedQueries: string[];
}

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

export function formatSources(sources: ResearchSource[]): string {
  if (!sources.length) {
    return "(no numbered sources)";
  }
  return sources
    .map(
      (source, index) =>
        `[${index + 1}] ${source.title} — ${source.sourceName} (${source.url})`,
    )
    .join("\n");
}

/**
 * Steps 3-4. One grounded call covers both the web research and the source
 * collection: Gemini issues the searches, and the source list comes from
 * `groundingMetadata` rather than from anything the model wrote, so tier
 * assignment and independence counting stay auditable.
 */
export async function researchContext({
  input,
  extraction,
  queries,
  geminiApiKey,
}: {
  input: ResearchInput;
  extraction: EntityExtraction;
  queries: SearchQuery[];
  geminiApiKey?: string;
}): Promise<ResearchContextResult> {
  const prompt = RESEARCH_CONTEXT_PROMPT.replaceAll("{{productName}}", input.productName)
    .replaceAll("{{category}}", input.category || "unknown")
    .replaceAll(
      "{{entities}}",
      extraction.entities.map((entity) => entity.name).join(", ") || "(none)",
    )
    .replaceAll("{{possibleEvent}}", extraction.possibleEvent || "(unclear)")
    .replaceAll("{{year}}", extraction.year || "(none)")
    .replaceAll(
      "{{queries}}",
      queries.map((query) => `- ${query.query}`).join("\n") || "(none)",
    );

  const grounded = await geminiGrounded({ prompt, apiKey: geminiApiKey });

  let parsed: Record<string, unknown> = {};
  try {
    parsed = extractJson<Record<string, unknown>>(grounded.text);
  } catch {
    parsed = {};
  }

  const trendType = VALID_TREND_TYPES.includes(parsed.trendType as TrendType)
    ? (parsed.trendType as TrendType)
    : extraction.trendTypeHint;

  // Authority is topic-specific, so the tiers are only trustworthy once the
  // real trend type is known. Classification is therefore deferred until here.
  const classified = grounded.sources.map((source, index) =>
    classifySource(source, extraction.entities as ResearchEntity[], trendType, index),
  );

  const sources = selectUsefulSources(classified);

  return {
    summary: asString(parsed.summary),
    event: asString(parsed.event) || undefined,
    season: asString(parsed.season) || undefined,
    breaking: parsed.breaking === true,
    trendType,
    entitiesConfirmed: Array.isArray(parsed.entitiesConfirmed)
      ? (parsed.entitiesConfirmed as unknown[])
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim())
          .filter(Boolean)
          .slice(0, 8)
      : [],
    context: asString(parsed.context),
    significance: asString(parsed.significance),
    canBeEstablished: parsed.canBeEstablished !== false,
    reasonIfNot: asString(parsed.reasonIfNot) || undefined,
    sources,
    executedQueries: grounded.queries.slice(0, RESEARCH_LIMITS.MAX_QUERIES),
  };
}
