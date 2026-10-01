import { describe, expect, it } from "vitest";
import {
  buildDescriptionPrompt,
  shouldUseResearch,
} from "../buildDescriptionPrompt";
import { ResearchTopic } from "@/types/research";

const NOW = new Date().toISOString();

function topic(overrides: Partial<ResearchTopic> = {}): ResearchTopic {
  return {
    topicKey: "aja-wilson-dawn-staley-2026",
    provisionalTopicKey: "aja-wilson-dawn-staley-2026",
    aliases: [],
    status: "completed",
    searchWorthy: true,
    trendType: "sports_event",
    entities: [
      { name: "A'ja Wilson", type: "athlete" },
      { name: "Dawn Staley", type: "coach" },
    ],
    queries: [],
    sources: [
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
    ],
    claims: [
      {
        id: "c1",
        claim: "A'ja Wilson led the team in scoring during the season.",
        claimType: "fact",
        importance: "high",
        sources: ["s1", "s2"],
        independentDomains: ["mlb.com", "apnews.com"],
        status: "verified",
        confidence: 0.9,
      },
    ],
    storyBrief: {
      topic: "A'ja Wilson and Dawn Staley",
      trendType: "sports_event",
      event: "season",
      season: "2026",
      context: "A'ja Wilson played her final season under Dawn Staley.",
      significance: "It closed a multi-year run at the top of the sport.",
      fanAngle: "Supporters followed the closing season closely.",
      entities: ["A'ja Wilson", "Dawn Staley"],
      verifiedFacts: ["A'ja Wilson led the team in scoring during the season."],
      searchIntent: ["A'ja Wilson Dawn Staley 2026"],
      contentAngle: "A closing-season tribute.",
      confidence: 0.8,
    },
    quality: {
      score: 78,
      band: "verified_only",
      dimensions: {
        entityIdentification: 1,
        storyIdentification: 1,
        sourceQuality: 1,
        factVerification: 1,
        currentRelevance: 1,
        searchIntent: 0.25,
      },
      penalties: [],
    },
    researchedAt: NOW,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

const product = { Name: "A'ja Wilson Tee", Categories: "Clothing > Unisex T-Shirts" } as any;

describe("shouldUseResearch", () => {
  it("is false when research is off, missing, or fell back", () => {
    expect(shouldUseResearch(undefined)).toBe(false);
    expect(shouldUseResearch(topic({ status: "insufficient" }))).toBe(false);
    expect(shouldUseResearch(topic({ status: "failed" }))).toBe(false);
    expect(shouldUseResearch(topic({ quality: { ...topic().quality, band: "fallback" } }))).toBe(false);
  });

  it("is true for the two usable bands only", () => {
    expect(shouldUseResearch(topic({ quality: { ...topic().quality, band: "full" } }))).toBe(true);
    expect(shouldUseResearch(topic())).toBe(true);
  });
});

describe("buildDescriptionPrompt", () => {
  it("passes the prompt straight through when research is disabled", () => {
    const storePrompt = "Write 80 words about {product-name} in {category} for {website}.";

    const prompt = buildDescriptionPrompt({
      storePrompt,
      product,
      website: "https://shop.example",
      topic: undefined,
    });

    expect(prompt).toBe(
      "Write 80 words about A'ja Wilson Tee in Unisex T-Shirts for https://shop.example.",
    );
    expect(prompt).not.toContain("VERIFIED");
  });

  it("adds nothing at all for a generic product", () => {
    const storePrompt = "Write 80 words about {product-name}.";

    const prompt = buildDescriptionPrompt({
      storePrompt,
      product,
      website: "https://shop.example",
      topic: topic({ searchWorthy: false, status: "insufficient" }),
    });

    // Only the usual placeholder substitution happens.
    expect(prompt).toBe("Write 80 words about A'ja Wilson Tee.");
  });

  it("warns the writer when research was attempted but produced nothing", () => {
    const prompt = buildDescriptionPrompt({
      storePrompt: "Write 80 words about {product-name}.",
      product,
      website: "https://shop.example",
      topic: topic({ status: "insufficient", storyBrief: undefined }),
    });

    expect(prompt).toContain("Write 80 words");
    expect(prompt.toLowerCase()).toContain("do not");
  });

  it("prepends the verified block and fills a {product-story} placeholder", () => {
    const prompt = buildDescriptionPrompt({
      storePrompt: "Write about {product-name}. Context: {product-story}",
      product,
      website: "https://shop.example",
      topic: topic(),
    });

    expect(prompt).toContain("VERIFIED FACTS");
    expect(prompt).toContain("A'ja Wilson led the team in scoring during the season.");
    expect(prompt).toContain("https://shop.example".length > 0 ? "Context:" : "");
    // The placeholder must be replaced, not shipped to the model.
    expect(prompt).not.toContain("{product-story}");
  });

  it("never leaks research metadata into a usable prompt", () => {
    const prompt = buildDescriptionPrompt({
      storePrompt: "{product-story}",
      product,
      website: "https://shop.example",
      topic: topic(),
    });

    expect(prompt).not.toContain("{{researchBlock}}");
    expect(prompt).not.toContain("quality score");
    expect(prompt).not.toContain("score=78");
  });

  it("uses the default prompt when a researched store has no saved prompt", () => {
    const prompt = buildDescriptionPrompt({
      storePrompt: "",
      product,
      website: "https://shop.example",
      topic: topic(),
    });

    expect(prompt).toContain("eCommerce copywriter");
    expect(prompt).not.toContain("{product-name}");
    expect(prompt).not.toContain("{website}");
  });

  it("leaves a blank prompt blank when research is off", () => {
    expect(
      buildDescriptionPrompt({ storePrompt: "", product, website: "https://shop.example" }),
    ).toBe("");
  });
});