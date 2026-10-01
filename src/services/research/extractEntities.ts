import { extractJson } from "@/lib/ai/extractJson";
import { EXTRACT_ENTITIES_PROMPT } from "@/constant/researchPrompts";
import gemini from "@/services/ai/gemini";
import { EntityExtraction, ResearchEntity, ResearchInput, TrendType } from "@/types/research";

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

function normalizeEntities(value: unknown): ResearchEntity[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();

  return value
    .filter((item): item is { name: string; type?: string } =>
      Boolean(item && typeof (item as any).name === "string"),
    )
    .map((item) => ({
      name: item.name.trim(),
      type: (item.type || "unknown").trim().toLowerCase(),
    }))
    .filter((entity) => {
      if (!entity.name) {
        return false;
      }
      const key = entity.name.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .slice(0, 6);
}

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);
}

/**
 * Step 1. No search happens here — this only decides whether a search is worth
 * doing and what it should target. A title that reduces to nothing but apparel
 * and customization words returns `searchWorthy: false`, which short-circuits
 * the whole research flow.
 */
export async function extractEntities({
  input,
  geminiApiKey,
}: {
  input: ResearchInput;
  geminiApiKey?: string;
}): Promise<EntityExtraction> {
  const prompt = EXTRACT_ENTITIES_PROMPT.replaceAll("{{productName}}", input.productName)
    .replaceAll("{{category}}", input.category || "unknown")
    .replaceAll("{{website}}", input.website || "unknown");

  const content = await gemini(prompt, geminiApiKey);
  const parsed = extractJson<Record<string, unknown>>(content);

  const trendTypeHint = VALID_TREND_TYPES.includes(parsed.trendTypeHint as TrendType)
    ? (parsed.trendTypeHint as TrendType)
    : "generic";

  const entities = normalizeEntities(parsed.entities);

  const year =
    typeof parsed.year === "string" && /^\d{4}$/.test(parsed.year.trim())
      ? parsed.year.trim()
      : undefined;

  return {
    entities,
    topic: typeof parsed.topic === "string" ? parsed.topic.trim() : "",
    year,
    possibleEvent:
      typeof parsed.possibleEvent === "string" ? parsed.possibleEvent.trim() : undefined,
    uncertainties: normalizeStringList(parsed.uncertainties),
    ambiguousRelationships: normalizeStringList(parsed.ambiguousRelationships),
    searchWorthy: parsed.searchWorthy === true && entities.length > 0,
    trendTypeHint,
  };
}
