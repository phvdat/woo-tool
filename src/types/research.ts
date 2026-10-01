export type ResearchStatus =
  | "pending"
  | "researching"
  | "completed"
  | "insufficient"
  | "failed";

export type ClaimType = "fact" | "interpretation" | "social_signal";

export type ClaimStatus = "verified" | "unverified" | "disputed";

export type ClaimImportance = "high" | "medium" | "low";

export type SourceType =
  | "official"
  | "news"
  | "social"
  | "community"
  | "other";

export type SourceTier = 1 | 2 | 3;

export type TrendType =
  | "sports_event"
  | "music_release"
  | "tour"
  | "film_tv"
  | "celebrity"
  | "viral_moment"
  | "franchise"
  | "brand"
  | "generic";

export type SearchQueryType =
  | "exact_phrase"
  | "entity_relationship"
  | "event_context"
  | "recent_news"
  | "official_source"
  | "social_viral"
  | "season_year"
  | "broader_topic";

export interface ResearchEntity {
  name: string;
  type: string;
}

export interface SearchQuery {
  query: string;
  type: SearchQueryType;
}

export interface ResearchSource {
  id: string;
  url: string;
  title: string;
  publishedAt?: string;
  sourceName: string;
  sourceType: SourceType;
  tier: SourceTier;
  relevance: number;
  isSnippetOnly: boolean;
}

export interface ResearchClaim {
  id: string;
  claim: string;
  claimType: ClaimType;
  importance: ClaimImportance;
  sources: string[];
  independentDomains: string[];
  status: ClaimStatus;
  confidence: number;
  note?: string;
}

export interface ProductStoryBrief {
  topic: string;
  trendType: TrendType;
  event?: string;
  season?: string;
  breaking?: boolean;
  context: string;
  significance: string;
  fanAngle: string;
  entities: string[];
  verifiedFacts: string[];
  searchIntent: string[];
  contentAngle: string;
  confidence: number;
}

export interface ResearchQuality {
  score: number;
  band: "full" | "verified_only" | "retry" | "fallback";
  dimensions: {
    entityIdentification: number;
    storyIdentification: number;
    sourceQuality: number;
    factVerification: number;
    currentRelevance: number;
    searchIntent: number;
  };
  penalties: string[];
}

export interface ResearchInput {
  productName: string;
  category?: string;
  productUrl?: string;
  description?: string;
  website?: string;
}

export interface EntityExtraction {
  entities: ResearchEntity[];
  topic: string;
  year?: string;
  possibleEvent?: string;
  uncertainties: string[];
  ambiguousRelationships: string[];
  searchWorthy: boolean;
  trendTypeHint: TrendType;
}

export interface ResearchTopic {
  _id?: string;
  topicKey: string;
  provisionalTopicKey: string;
  aliases: string[];
  status: ResearchStatus;
  reason?: string;
  /** False when the title had no verifiable subject, so the writer keeps its plain path. */
  searchWorthy?: boolean;
  trendType: TrendType;
  entities: ResearchEntity[];
  queries: SearchQuery[];
  sources: ResearchSource[];
  claims: ResearchClaim[];
  storyBrief?: ProductStoryBrief;
  quality: ResearchQuality;
  llmConfidence?: number;
  researchedAt?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResearchContext {
  geminiApiKey?: string;
  forceRefresh?: boolean;
}
