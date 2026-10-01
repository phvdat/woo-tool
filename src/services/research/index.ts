import {
  EntityExtraction,
  ResearchClaim,
  ResearchContext,
  ResearchEntity,
  ResearchInput,
  ResearchQuality,
  ResearchSource,
  ResearchTopic,
  TrendType,
} from "@/types/research";
import { extractEntities } from "./extractEntities";
import { generateQueries } from "./generateQueries";
import { researchContext } from "./searchSources";
import { extractClaims } from "./extractClaims";
import { verifyClaims } from "./verifyClaims";
import { buildStoryBrief } from "./buildStoryBrief";
import { assessQuality } from "./assessQuality";
import { buildProvisionalTopicKey, buildTopicKey, resolveFreshnessMs } from "./topicKey";
import { toResearchSource } from "./sourceTiers";
import { findFreshTopic, saveTopic } from "./repository";

/**
 * Mirrors the in-flight guard style in `lib/blog/runAutoBlog.ts`. Single process,
 * so this is enough to stop two products in one batch researching the same topic
 * concurrently.
 */
const inFlight = new Set<string>();

function nowIso(): string {
  return new Date().toISOString();
}

function emptyQuality(): ResearchQuality {
  return {
    score: 0,
    band: "fallback",
    dimensions: {
      entityIdentification: 0,
      storyIdentification: 0,
      sourceQuality: 0,
      factVerification: 0,
      currentRelevance: 0,
      searchIntent: 0,
    },
    penalties: [],
  };
}

function emptyExtraction(): EntityExtraction {
  return {
    entities: [],
    topic: "",
    uncertainties: [],
    ambiguousRelationships: [],
    searchWorthy: false,
    trendTypeHint: "generic",
  };
}

function shell(extraction: EntityExtraction, provisionalTopicKey: string): ResearchTopic {
  const timestamp = nowIso();
  return {
    topicKey: provisionalTopicKey,
    provisionalTopicKey,
    aliases: [],
    status: "researching",
    searchWorthy: extraction.searchWorthy,
    trendType: extraction.trendTypeHint,
    entities: extraction.entities,
    queries: [],
    sources: [],
    claims: [],
    quality: emptyQuality(),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function settle(
  topic: ResearchTopic,
  status: ResearchTopic["status"],
  reason: string,
  breaking?: boolean,
): ResearchTopic {
  topic.status = status;
  topic.reason = reason;
  topic.researchedAt = nowIso();
  topic.updatedAt = topic.researchedAt;
  topic.expiresAt = new Date(
    Date.now() + resolveFreshnessMs(topic.trendType, breaking),
  ).toISOString();
  topic.quality = assessQuality(topic);
  return topic;
}

async function persist(topic: ResearchTopic) {
  try {
    await saveTopic(topic);
  } catch (error: any) {
    // A caching failure must never fail the product run.
    console.warn(
      `[RESEARCH] failed to persist topic ${topic.topicKey}: ${error?.message || "unknown error"}`,
    );
  }
}

/**
 * Steps 3-8 for one already-extracted subject. Cache lookup happens on the
 * provisional key, and the persisted record is written under the final key once
 * the event is known, with the provisional key kept in `aliases` so later
 * products reach the same record.
 */
async function resolveTopic({
  input,
  extraction,
  provisionalTopicKey,
  context,
}: {
  input: ResearchInput;
  extraction: EntityExtraction;
  provisionalTopicKey: string;
  context: ResearchContext;
}): Promise<ResearchTopic> {
  if (!context.forceRefresh) {
    // A cache miss is the normal path, but a *broken* cache must not fail the
    // product run: research is an enhancement, so an unreachable Mongo degrades
    // to "no cache" rather than throwing out of the pipeline.
    let cached: ResearchTopic | null = null;
    try {
      cached = await findFreshTopic([provisionalTopicKey]);
    } catch (error: any) {
      console.warn(
        `[RESEARCH] cache lookup failed for "${input.productName}": ${error?.message || "unknown error"}`,
      );
    }

    if (cached) {
      console.log(`[RESEARCH] cache hit ${cached.topicKey} for "${input.productName}"`);
      return cached;
    }
  }

  if (inFlight.has(provisionalTopicKey)) {
    return settle(
      shell(extraction, provisionalTopicKey),
      "insufficient",
      "Research for this topic is already running.",
    );
  }

  const queries = generateQueries(extraction);

  if (!queries.length) {
    return settle(
      shell(extraction, provisionalTopicKey),
      "insufficient",
      "No useful search query could be derived from the title.",
    );
  }

  inFlight.add(provisionalTopicKey);

  let sources: ResearchSource[] = [];
  let claims: ResearchClaim[] = [];
  let trendType: TrendType = extraction.trendTypeHint;

  try {
    const research = await researchContext({
      input,
      extraction,
      queries,
      geminiApiKey: context.geminiApiKey,
    });

    trendType = research.trendType;
    sources = research.sources.map(toResearchSource);

    const topic = shell(extraction, provisionalTopicKey);
    topic.trendType = trendType;
    topic.queries = queries;
    topic.sources = sources;

    const confirmedEntities: ResearchEntity[] = research.entitiesConfirmed.length
      ? research.entitiesConfirmed.map((name) => {
          const match = extraction.entities.find(
            (entity) => entity.name.toLowerCase() === name.toLowerCase(),
          );
          return match || { name, type: "confirmed" };
        })
      : extraction.entities;

    topic.entities = confirmedEntities;

    if (!research.canBeEstablished || !sources.length) {
      settle(
        topic,
        "insufficient",
        research.reasonIfNot ||
          (sources.length
            ? "Sources were found but the subject of the product could not be established."
            : "No sources were returned for this topic."),
        research.breaking,
      );
      await persist(topic);
      return topic;
    }

    const extractedClaims = await extractClaims({
      summary: research.summary,
      event: research.event,
      season: research.season,
      entitiesConfirmed: research.entitiesConfirmed,
      sources,
      geminiApiKey: context.geminiApiKey,
    });

    claims = await verifyClaims({
      claims: extractedClaims,
      sources,
      geminiApiKey: context.geminiApiKey,
    });
    topic.claims = claims;

    const brief = await buildStoryBrief({
      input,
      topic: extraction.topic,
      event: research.event,
      season: research.season,
      entities: confirmedEntities.map((entity) => entity.name),
      claims,
      sources,
      trendType,
      geminiApiKey: context.geminiApiKey,
    });

    if (!brief) {
      settle(
        topic,
        "insufficient",
        "No fact could be independently confirmed, so no product story was assembled.",
      );
      await persist(topic);
      return topic;
    }

    topic.storyBrief = brief;
    topic.llmConfidence = brief.confidence;

    const finalKey = buildTopicKey({
      entities: confirmedEntities,
      event: research.event || brief.event,
      season: research.season || brief.season,
    });

    topic.topicKey = finalKey || provisionalTopicKey;
    topic.aliases = Array.from(
      new Set(
        [
          provisionalTopicKey,
          buildTopicKey({
            entities: confirmedEntities,
            season: research.season || brief.season,
          }),
        ].filter((key) => key && key !== topic.topicKey),
      ),
    );

    settle(topic, "completed", "", brief.breaking);

    // A topic that landed in the fallback band must not be cached as if it were
    // a verified story; the next product deserves a fresh attempt.
    if (topic.quality.band === "fallback") {
      topic.status = "insufficient";
      topic.reason =
        topic.quality.penalties[0] || "Evidence was too weak to generate context-aware copy.";
    }

    await persist(topic);
    console.log(
      `[RESEARCH] ${topic.topicKey} status=${topic.status} score=${topic.quality.score} sources=${topic.sources.length} claims=${topic.claims.length}`,
    );

    return topic;
  } catch (error: any) {
    console.warn(
      `[RESEARCH] failed for ${provisionalTopicKey || input.productName}: ${error?.message || "unknown error"}`,
    );
    const topic = shell(extraction, provisionalTopicKey);
    topic.trendType = trendType;
    // Keep the attempted queries: a failure is far easier to diagnose from the
    // persisted record when you can see what was actually asked.
    topic.queries = queries;
    topic.sources = sources;
    topic.claims = claims;
    return settle(topic, "failed", "Web research could not be completed.");
  } finally {
    inFlight.delete(provisionalTopicKey);
  }
}

/**
 * Product → Research → Verified Product Story Brief.
 *
 * `insufficient` and `failed` are normal outcomes, not errors. Callers are
 * expected to fall back to a conservative description.
 */
export async function researchProduct(
  input: ResearchInput,
  context: ResearchContext = {},
): Promise<ResearchTopic> {
  let extraction: EntityExtraction;

  try {
    extraction = await extractEntities({ input, geminiApiKey: context.geminiApiKey });
  } catch (error: any) {
    console.warn(
      `[RESEARCH] entity extraction failed for "${input.productName}": ${error?.message || "unknown error"}`,
    );
    return settle(
      shell(emptyExtraction(), ""),
      "failed",
      "Entity extraction failed.",
    );
  }

  // Generic products never pay for a search.
  if (!extraction.searchWorthy || !extraction.entities.length) {
    return settle(
      shell(extraction, ""),
      "insufficient",
      "No verifiable subject was identified; this is a generic product.",
    );
  }

  return resolveTopic({
    input,
    extraction,
    provisionalTopicKey: buildProvisionalTopicKey(extraction.entities, extraction.year),
    context,
  });
}

export interface ProductResearchInput extends ResearchInput {
  productName: string;
}

/**
 * Batch entry point, keyed by lowercased product name so the caller can look up
 * with `product.Name`. Entity extraction runs per product because it is cheap and
 * search-free; the expensive part runs once per distinct provisional key, so a
 * T-shirt, hoodie and sweatshirt about the same event share one research pass.
 */
export async function researchBatch(
  products: ProductResearchInput[],
  context: ResearchContext = {},
): Promise<Map<string, ResearchTopic>> {
  const result = new Map<string, ResearchTopic>();
  const resolvedKeys = new Map<string, ResearchTopic>();

  for (const product of products) {
    const lookupKey = (product.productName || "").trim().toLowerCase();
    if (!lookupKey || result.has(lookupKey)) {
      continue;
    }

    let extraction: EntityExtraction;
    try {
      extraction = await extractEntities({
        input: product,
        geminiApiKey: context.geminiApiKey,
      });
    } catch (error: any) {
      console.warn(
        `[RESEARCH] entity extraction failed for "${product.productName}": ${error?.message || "unknown error"}`,
      );
      result.set(
        lookupKey,
        settle(shell(emptyExtraction(), ""), "failed", "Entity extraction failed."),
      );
      continue;
    }

    if (!extraction.searchWorthy || !extraction.entities.length) {
      result.set(
        lookupKey,
        settle(
          shell(extraction, ""),
          "insufficient",
          "No verifiable subject was identified; this is a generic product.",
        ),
      );
      continue;
    }

    const provisionalTopicKey = buildProvisionalTopicKey(
      extraction.entities,
      extraction.year,
    );

    // Another product in this batch already resolved this exact key.
    const alreadyInBatch = resolvedKeys.get(provisionalTopicKey);
    if (alreadyInBatch) {
      result.set(lookupKey, alreadyInBatch);
      continue;
    }

    const topic = await resolveTopic({
      input: product,
      extraction,
      provisionalTopicKey,
      context,
    });

    resolvedKeys.set(provisionalTopicKey, topic);
    if (topic.topicKey) {
      resolvedKeys.set(topic.topicKey, topic);
    }
    for (const alias of topic.aliases) {
      resolvedKeys.set(alias, topic);
    }

    result.set(lookupKey, topic);
  }

  return result;
}

export { assessQuality } from "./assessQuality";
export { validateDescription } from "./validateDescription";
export { buildDescriptionPrompt, buildFallbackPrompt, shouldUseResearch } from "./buildDescriptionPrompt";
export { listTopics, findFreshTopic } from "./repository";
export { buildProvisionalTopicKey, buildTopicKey } from "./topicKey";
