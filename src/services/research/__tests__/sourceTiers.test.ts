import { describe, expect, it } from "vitest";
import {
  buildSourceIndex,
  classifySource,
  confidenceFromWeight,
  independentConfirmations,
  resolveSourceIds,
  resolveAuthority,
  selectUsefulSources,
} from "../sourceTiers";
import { ResearchSource } from "@/types/research";

const entities = [
  { name: "Cleveland Guardians", type: "team" },
  { name: "MLB", type: "league" },
];

function source(overrides: Partial<ResearchSource> & { url: string; id: string }): ResearchSource {
  return {
    title: "A distinct headline about the subject",
    sourceName: "example.com",
    sourceType: "other",
    tier: 2,
    relevance: 0.7,
    isSnippetOnly: false,
    ...overrides,
  };
}

describe("resolveAuthority", () => {
  it("recognises an official governing site for the detected trend", () => {
    expect(resolveAuthority("https://www.mlb.com/guardians", entities, "sports_event")).toEqual({
      sourceType: "official",
      tier: 1,
      relevance: 0.9,
    });
  });

  it("recognises a domain that carries an entity name", () => {
    expect(resolveAuthority("https://jonasbrothers.com/tour", [{ name: "Jonas Brothers", type: "artist" }], "tour").tier).toBe(1);
  });

  it("does not treat a shop named after the subject as official", () => {
    const authority = resolveAuthority(
      "https://aja-wilson-shop.com/products/tee",
      [{ name: "A'ja Wilson", type: "athlete" }],
      "celebrity",
    );

    expect(authority.tier).not.toBe(1);
  });

  it("only accepts an official host marker as a whole label", () => {
    expect(
      resolveAuthority("https://official.example.com/a", entities, "sports_event").tier,
    ).toBe(1);
    expect(
      resolveAuthority("https://league.example.com/a", entities, "sports_event").tier,
    ).toBe(1);

    // A real news host that merely contains a marker word is not an official body.
    expect(
      resolveAuthority("https://not-official-sports.example.com/a", entities, "sports_event")
        .sourceType,
    ).not.toBe("official");
  });

  it("keeps suffix markers working for government and military sources", () => {
    expect(resolveAuthority("https://www.census.gov/x", entities, "sports_event").tier).toBe(1);
  });

  it("classifies community and social hosts as Tier 3", () => {
    expect(resolveAuthority("https://www.reddit.com/r/baseball/comments/1", entities, "sports_event")).toEqual({
      sourceType: "community",
      tier: 3,
      relevance: 0.4,
    });
    expect(resolveAuthority("https://x.com/someone/status/1", entities, "sports_event").tier).toBe(3);
  });

  it("is topic-driven - music outlets are Tier 2 for a tour, not for a game", () => {
    expect(resolveAuthority("https://www.billboard.com/music/tour", entities, "tour").sourceType).toBe("news");
    expect(resolveAuthority("https://www.espn.com/nfl/story", entities, "sports_event").sourceType).toBe("news");
  });

  it("falls back to other for an unrecognised domain", () => {
    expect(resolveAuthority("https://somerandomsite.example/page", entities, "sports_event")).toEqual({
      sourceType: "other",
      tier: 2,
      relevance: 0.7,
    });
  });
});

describe("selectUsefulSources", () => {
  it("Case 3 - keeps at most six sources and prefers the strongest ones", () => {
    const many = Array.from({ length: 12 }, (_, index) =>
      classifySource(
        {
          url: `https://outlet${index}.example/article-${index}`,
          title: `Outlet ${index} headline`,
          domain: `outlet${index}.example`,
        },
        entities,
        "sports_event",
        index,
      ),
    );

    const kept = selectUsefulSources(many);

    expect(kept.length).toBeLessThanOrEqual(6);
  });

  it("puts Tier 1 sources ahead of Tier 2 in the kept set", () => {
    const sources = [
      classifySource({ url: "https://www.espn.com/a", title: "ESPN piece", domain: "espn.com" }, entities, "sports_event", 0),
      classifySource({ url: "https://www.mlb.com/guardians", title: "MLB release", domain: "mlb.com" }, entities, "sports_event", 1),
      classifySource({ url: "https://www.cbssports.com/b", title: "CBS piece", domain: "cbssports.com" }, entities, "sports_event", 2),
    ];

    const kept = selectUsefulSources(sources);

    expect(kept[0].tier).toBe(1);
    expect(kept.length).toBe(3);
  });
});

describe("independentConfirmations", () => {
  it("§6 - two URLs on the same domain count once", () => {
    const sources = [
      source({ id: "s1", url: "https://apnews.com/a" }),
      source({ id: "s2", url: "https://apnews.com/b" }),
    ];
    const result = independentConfirmations(["s1", "s2"], buildSourceIndex(sources));

    expect(result.count).toBe(1);
    expect(result.domains).toEqual(["apnews.com"]);
  });

  it("§6 - a syndicated copy does not count as corroboration", () => {
    const sources = [
      source({ id: "s1", url: "https://apnews.com/a", title: "Guardians Clinch Berth" }),
      source({ id: "s2", url: "https://someotheroutlet.com/a", title: "the guardians clinch a berth" }),
    ];
    const result = independentConfirmations(["s1", "s2"], buildSourceIndex(sources));

    expect(result.count).toBe(1);
  });

  it("§6 - Tier 3 and snippet-only sources carry no weight", () => {
    const sources = [
      source({ id: "s1", url: "https://www.reddit.com/r/x/comments/1", tier: 3, sourceType: "community" }),
      source({ id: "s2", url: "https://tiktok.com/@x/1", tier: 3, sourceType: "social" }),
      source({ id: "s3", url: "https://news.example.com/a", isSnippetOnly: true }),
    ];
    const result = independentConfirmations(["s1", "s2", "s3"], buildSourceIndex(sources));

    expect(result.weight).toBe(0);
    expect(result.count).toBe(0);
  });

  it("counts two independent Tier 1 sources as full corroboration", () => {
    const sources = [
      source({ id: "s1", url: "https://www.mlb.com/guardians", tier: 1, sourceType: "official", title: "Guardians announce roster moves" }),
      source({ id: "s2", url: "https://www.baseball-reference.com/x", tier: 1, sourceType: "official", title: "Season scoring leaders listed" }),
    ];
    const result = independentConfirmations(["s1", "s2"], buildSourceIndex(sources));

    expect(result.count).toBe(2);
    expect(result.domains).toEqual(["mlb.com", "baseball-reference.com"]);
    expect(confidenceFromWeight(result.weight)).toBeGreaterThan(0.8);
  });

  it("treats the same headline on two domains as one confirmation", () => {
    const sources = [
      source({ id: "s1", url: "https://apnews.com/a", title: "Guardians Clinch Berth" }),
      source({ id: "s2", url: "https://someotheroutlet.com/a", title: "the guardians clinch a berth" }),
    ];

    expect(independentConfirmations(["s1", "s2"], buildSourceIndex(sources)).count).toBe(1);
  });
});

describe("resolveSourceIds", () => {
  it("accepts ids, urls and loose url fragments", () => {
    const sources = [
      source({ id: "s1", url: "https://apnews.com/a" }),
      source({ id: "s2", url: "https://www.mlb.com/guardians" }),
    ];

    expect(resolveSourceIds(["s2"], sources)).toEqual(["s2"]);
    expect(resolveSourceIds(["https://apnews.com/a"], sources)).toEqual(["s1"]);
    expect(resolveSourceIds(["mlb.com/guardians"], sources)).toEqual(["s2"]);
  });

  it("drops references that match no source instead of guessing", () => {
    const sources = [source({ id: "s1", url: "https://apnews.com/a" })];

    expect(resolveSourceIds(["s7", "", "   "], sources)).toEqual([]);
  });
});
