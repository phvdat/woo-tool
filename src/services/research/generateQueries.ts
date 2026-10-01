import { QUERY_TYPES_BY_TREND, RESEARCH_LIMITS } from "@/constant/research";
import { EntityExtraction, SearchQuery, SearchQueryType, TrendType } from "@/types/research";
import { substantiveTokens } from "./topicKey";

function quoted(value: string): string {
  return `"${value.replace(/"/g, "").trim()}"`;
}

function entityPair(entities: string[]): string {
  return entities.slice(0, 2).map(quoted).join(" ");
}

function entityGroup(entities: string[]): string {
  return entities.slice(0, 3).join(" ");
}

function phraseFromTitle(extraction: EntityExtraction): string {
  const phrase = (extraction.possibleEvent || extraction.topic || "").trim();
  if (!phrase) {
    return "";
  }
  return substantiveTokens(phrase).length >= 2 ? phrase : "";
}

function build(type: SearchQueryType, query: string): SearchQuery | null {
  const trimmed = query.replace(/\s+/g, " ").trim();
  if (!trimmed) {
    return null;
  }
  return { type, query: trimmed };
}

/**
 * Query types are chosen from the detected `trendType`, so a tour product
 * produces music/tour searches and a basketball product produces event searches.
 * Nothing about sports is hardcoded here.
 */
export function generateQueries(extraction: EntityExtraction): SearchQuery[] {
  if (!extraction.searchWorthy) {
    return [];
  }

  const entities = extraction.entities.map((entity) => entity.name.trim()).filter(Boolean);
  if (!entities.length) {
    return [];
  }

  const trendType = (extraction.trendTypeHint || "generic") as TrendType;
  const allowed = (QUERY_TYPES_BY_TREND[trendType] as readonly string[] | undefined) || [];

  if (!allowed.includes("exact_phrase")) {
    return [];
  }

  const phrase = phraseFromTitle(extraction);
  const year = extraction.year?.trim();
  const queries: SearchQuery[] = [];

  const push = (type: SearchQueryType, query: string) => {
    if (!allowed.includes(type)) {
      return;
    }
    const built = build(type, query);
    if (built) {
      queries.push(built);
    }
  };

  push("exact_phrase", phrase ? quoted(phrase) : quoted(entityGroup(entities)));

  if (entities.length >= 2) {
    push("entity_relationship", entityPair(entities));
    push("event_context", `${entityPair(entities)} ${phrase || ""}`.trim());
  } else {
    push("event_context", phrase ? `${quoted(entities[0])} ${phrase}` : "");
  }

  push("recent_news", year ? `${entityGroup(entities)} ${year} news` : `${entityGroup(entities)} news`);
  push("official_source", `${entityGroup(entities)} official`);
  push("social_viral", `${entityPair(entities) || quoted(entities[0])} viral`);
  push("season_year", year ? `${entityGroup(entities)} ${year}` : "");
  push("broader_topic", extraction.topic.trim());

  const deduped: SearchQuery[] = [];
  const seen = new Set<string>();
  for (const query of queries) {
    const key = query.query.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(query);
  }

  return deduped.slice(0, RESEARCH_LIMITS.MAX_QUERIES);
}

/** The typed queries, flattened for the grounded call. */
export function queriesToPrompts(queries: SearchQuery[]): string[] {
  return queries.map((query) => query.query).filter(Boolean);
}
