import { extractJson } from "@/lib/ai/extractJson";
import { VERIFY_CLAIMS_PROMPT } from "@/constant/researchPrompts";
import { RESEARCH_LIMITS } from "@/constant/research";
import gemini from "@/services/ai/gemini";
import {
  ClaimStatus,
  ResearchClaim,
  ResearchSource,
} from "@/types/research";
import { formatSources } from "./searchSources";
import {
  buildSourceIndex,
  confidenceFromWeight,
  independentConfirmations,
} from "./sourceTiers";

const VALID_STATUS: ClaimStatus[] = ["verified", "unverified", "disputed"];

function claimToPrompt(claim: ResearchClaim, sourceNumbers: Map<string, number>): string {
  const cites = claim.sources
    .map((id) => sourceNumbers.get(id))
    .filter((n): n is number => typeof n === "number");
  const citesLabel = cites.length ? cites.join(", ") : "none";
  return `- [${claim.id}] (${claim.claimType}/${claim.importance}) ${claim.claim}  — sources: ${citesLabel}`;
}

/**
 * Step 6. Verification is deterministic first: independence, authority weight
 * and conflict state come from the source list, never from the model. Only the
 * subset that evidence alone cannot settle — high-importance claims resting on a
 * single independent source — costs an extra call.
 */
export async function verifyClaims({
  claims,
  sources,
  geminiApiKey,
}: {
  claims: ResearchClaim[];
  sources: ResearchSource[];
  geminiApiKey?: string;
}): Promise<ResearchClaim[]> {
  if (!claims.length) {
    return claims;
  }

  const sourcesById = buildSourceIndex(sources);
  const sourceNumbers = new Map(sources.map((source, index) => [source.id, index + 1]));

  const settled: ResearchClaim[] = claims.map((claim) => {
    const { domains, weight, count } = independentConfirmations(claim.sources, sourcesById);

    let status: ClaimStatus;
    if (claim.claimType === "social_signal") {
      // A social signal is a signal by definition; it is never "verified".
      status = "unverified";
    } else if (count >= 2 && weight >= 1) {
      // Two or more independent sources of real authority.
      status = "verified";
    } else {
      // One source, or only Tier 3 / snippet-only support, is not corroboration.
      status = "unverified";
    }

    return {
      ...claim,
      independentDomains: domains,
      status,
      confidence: status === "verified" ? confidenceFromWeight(weight) : 0,
    };
  });

  const needsCheck = settled.filter(
    (claim) =>
      claim.status === "unverified" &&
      claim.claimType !== "social_signal" &&
      claim.importance === "high" &&
      claim.independentDomains.length === 1,
  );

  if (!needsCheck.length) {
    return settled;
  }

  let results: { id?: string; status?: string; note?: string }[] = [];
  try {
    const prompt = VERIFY_CLAIMS_PROMPT.replaceAll(
      "{{claims}}",
      settled.map((claim) => claimToPrompt(claim, sourceNumbers)).join("\n"),
    ).replaceAll("{{sources}}", formatSources(sources));

    const content = await gemini(prompt, geminiApiKey);
    const parsed = extractJson<{ results?: typeof results }>(content);
    results = Array.isArray(parsed.results) ? parsed.results : [];
  } catch (error: any) {
    // A failed verification pass must not fail the research: claims simply stay
    // unverified and the deterministic quality score reflects that.
    console.warn(
      `[RESEARCH] claim verification pass failed: ${error?.message || "unknown error"}`,
    );
    return settled;
  }

  const verdicts = new Map<string, { status: ClaimStatus; note?: string }>();
  for (const result of results.slice(0, RESEARCH_LIMITS.MAX_HIGH_IMPORTANCE_CLAIMS_TO_VERIFY)) {
    if (!result?.id || !VALID_STATUS.includes(result.status as ClaimStatus)) {
      continue;
    }
    verdicts.set(result.id, {
      status: result.status as ClaimStatus,
      note: typeof result.note === "string" && result.note.trim() ? result.note.trim() : undefined,
    });
  }

  return settled.map((claim) => {
    const verdict = verdicts.get(claim.id);
    if (!verdict) {
      return claim;
    }

    if (verdict.status === "disputed") {
      return { ...claim, status: "disputed" as ClaimStatus, confidence: 0, note: verdict.note };
    }

    if (verdict.status === "verified") {
      const { weight } = independentConfirmations(claim.sources, sourcesById);
      return {
        ...claim,
        status: "verified" as ClaimStatus,
        confidence: Math.max(claim.confidence, 0.6, confidenceFromWeight(weight)),
        note: verdict.note,
      };
    }

    return { ...claim, status: "unverified" as ClaimStatus, confidence: 0, note: verdict.note };
  });
}
