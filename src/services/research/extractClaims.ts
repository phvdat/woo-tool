import { extractJson } from "@/lib/ai/extractJson";
import { EXTRACT_CLAIMS_PROMPT } from "@/constant/researchPrompts";
import { RESEARCH_LIMITS } from "@/constant/research";
import gemini from "@/services/ai/gemini";
import {
  ClaimImportance,
  ClaimType,
  ResearchClaim,
  ResearchSource,
} from "@/types/research";
import { resolveSourceIds } from "./sourceTiers";
import { formatSources } from "./searchSources";

const VALID_CLAIM_TYPES: ClaimType[] = ["fact", "interpretation", "social_signal"];
const VALID_IMPORTANCE: ClaimImportance[] = ["high", "medium", "low"];

/** The model cites sources by 1-based position; source ids are `s1`, `s2`, … */
function positionToId(reference: unknown): string | null {
  if (typeof reference === "number" && Number.isInteger(reference) && reference > 0) {
    return `s${reference}`;
  }
  if (typeof reference === "string") {
    const trimmed = reference.trim();
    if (/^\d+$/.test(trimmed)) {
      return `s${Number(trimmed)}`;
    }
    return trimmed;
  }
  return null;
}

/**
 * Step 5. Claims are typed on the way in so the writer never has to guess
 * whether something is an established fact or a reading of one.
 */
export async function extractClaims({
  summary,
  event,
  season,
  entitiesConfirmed,
  sources,
  geminiApiKey,
}: {
  summary: string;
  event?: string;
  season?: string;
  entitiesConfirmed: string[];
  sources: ResearchSource[];
  geminiApiKey?: string;
}): Promise<ResearchClaim[]> {
  if (!sources.length) {
    return [];
  }

  const prompt = EXTRACT_CLAIMS_PROMPT.replaceAll("{{summary}}", summary || "(none)")
    .replaceAll("{{event}}", event || "(unclear)")
    .replaceAll("{{season}}", season || "(none)")
    .replaceAll("{{entitiesConfirmed}}", entitiesConfirmed.join(", ") || "(none)")
    .replaceAll("{{sources}}", formatSources(sources))
    .replaceAll("{{maxClaims}}", String(RESEARCH_LIMITS.MAX_CLAIMS));

  const content = await gemini(prompt, geminiApiKey);
  const parsed = extractJson<{ claims?: unknown[] }>(content);

  if (!Array.isArray(parsed.claims)) {
    return [];
  }

  const claims: ResearchClaim[] = [];

  for (const raw of parsed.claims) {
    if (claims.length >= RESEARCH_LIMITS.MAX_CLAIMS) {
      break;
    }

    const item = raw as Record<string, unknown>;
    const claim = typeof item.claim === "string" ? item.claim.trim() : "";
    if (!claim) {
      continue;
    }

    const claimType = VALID_CLAIM_TYPES.includes(item.claimType as ClaimType)
      ? (item.claimType as ClaimType)
      : "fact";

    const importance = VALID_IMPORTANCE.includes(item.importance as ClaimImportance)
      ? (item.importance as ClaimImportance)
      : "medium";

    const references = Array.isArray(item.sources)
      ? item.sources.map(positionToId).filter((id): id is string => Boolean(id))
      : [];

    claims.push({
      id: `c${claims.length + 1}`,
      claim,
      claimType,
      importance,
      sources: resolveSourceIds(references, sources),
      independentDomains: [],
      status: "unverified",
      confidence: 0,
    });
  }

  return claims;
}
