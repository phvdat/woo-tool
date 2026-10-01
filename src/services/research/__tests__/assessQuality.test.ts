import { describe, expect, it } from "vitest";
import { assessQuality, verifiedFacts } from "../assessQuality";
import { ResearchClaim, ResearchSource, ResearchTopic } from "@/types/research";

const NOW = new Date().toISOString();

const sources: ResearchSource[] = [
  {
    id: "s1",
    url: "https://www.mlb.com/guardians",
    title: "Official release",
    sourceName: "mlb.com",
    sourceType: "official",
    tier: 1,
    relevance: 0.9,
    isSnippetOnly: false,
  },
  {
    id: "s2",
    url: "https://apnews.com/story",
    title: "Wire report",
    sourceName: "apnews.com",
    sourceType: "news",
    tier: 1,
    relevance: 0.8,
    isSnippetOnly: false,
  },
];

const verifiedClaim: ResearchClaim = {
  id: "c1",
  claim: "A'ja Wilson led the team in scoring.",
  claimType: "fact",
  importance: "high",
  sources: ["s1", "s2"],
  independentDomains: ["mlb.com", "apnews.com"],
  status: "verified",
  confidence: 0.9,
};

function topic(overrides: Partial<ResearchTopic> = {}): ResearchTopic {
  return {
    topicKey: "k",
    provisionalTopicKey: "k",
    aliases: [],
    status: "completed",
    trendType: "sports_event",
    entities: [{ name: "A'ja Wilson", type: "athlete" }],
    queries: [],
    sources,
    claims: [verifiedClaim],
    storyBrief: {
      topic: "A'ja Wilson",
      trendType: "sports_event",
      event: "season",
      context: "A closing season for a long-running core of the team, widely covered.",
      significance: "It ended a multi-year run at the top of the sport.",
      fanAngle: "Supporters followed the closing season closely.",
      entities: ["A'ja Wilson"],
      verifiedFacts: [verifiedClaim.claim],
      searchIntent: ["a", "b", "c", "d"],
      contentAngle: "A tribute angle.",
      confidence: 0.8,
    },
    quality: {
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
    },
    researchedAt: NOW,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

describe("assessQuality", () => {
  it("Case 2 - strong evidence lands in a usable band", () => {
    const quality = assessQuality(topic());

    expect(quality.score).toBeGreaterThanOrEqual(60);
    expect(["full", "verified_only"]).toContain(quality.band);
    expect(quality.penalties).toHaveLength(0);
  });

  it("ignores the model's self-reported confidence", () => {
    const boastful = assessQuality(topic({ llmConfidence: 1 }));
    const modest = assessQuality(topic({ llmConfidence: 0.1 }));

    expect(boastful.score).toBe(modest.score);
  });

  it("punishes a disputed high-importance claim", () => {
    const clean = assessQuality(topic());
    const disputed = assessQuality(
      topic({
        claims: [
          {
            ...verifiedClaim,
            status: "disputed",
            note: "sources disagree on the date",
          },
        ],
      }),
    );

    expect(disputed.score).toBeLessThan(clean.score);
    expect(disputed.penalties.some((penalty) => penalty.includes("disputed"))).toBe(true);
  });

  it("flags social-only evidence", () => {
    const quality = assessQuality(
      topic({
        claims: [
          {
            ...verifiedClaim,
            claimType: "social_signal",
            status: "unverified",
          },
        ],
      }),
    );

    expect(quality.penalties).toContain("Only social/community signals were found, no primary facts");
  });

  it("scores a topic with no sources at the bottom", () => {
    const quality = assessQuality(topic({ sources: [], claims: [], storyBrief: undefined }));

    expect(quality.dimensions.sourceQuality).toBe(0);
    expect(quality.band).toBe("fallback");
  });

  it("does not claim Tier 3 evidence when nothing was found at all", () => {
    const quality = assessQuality(topic({ sources: [], claims: [], storyBrief: undefined }));

    // `[].every()` is vacuously true, so this penalty must be guarded.
    expect(quality.penalties).not.toContain("All sources are Tier 3 community/social");
  });

  it("does report Tier 3 evidence when Tier 3 sources exist", () => {
    const quality = assessQuality(
      topic({
        claims: [],
        storyBrief: undefined,
        sources: [
          { ...sources[0], id: "s1", tier: 3, sourceType: "community" },
          { ...sources[1], id: "s2", tier: 3, sourceType: "social" },
        ],
      }),
    );

    expect(quality.penalties).toContain("All sources are Tier 3 community/social");
  });

  it("decays with age", () => {
    const week = assessQuality(topic({ researchedAt: new Date(Date.now() - 7 * 864e5).toISOString() }));
    const fresh = assessQuality(topic());

    expect(week.dimensions.currentRelevance).toBeLessThan(fresh.dimensions.currentRelevance);
  });
});

describe("verifiedFacts", () => {
  it("keeps only confident, corroborated facts", () => {
    expect(
      verifiedFacts([
        verifiedClaim,
        { ...verifiedClaim, id: "c2", claimType: "interpretation" },
        { ...verifiedClaim, id: "c3", status: "unverified" },
        { ...verifiedClaim, id: "c4", confidence: 0.2 },
      ]),
    ).toEqual([verifiedClaim.claim]);
  });
});