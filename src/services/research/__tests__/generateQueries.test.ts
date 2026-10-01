import { describe, expect, it } from "vitest";
import { generateQueries } from "../generateQueries";
import { EntityExtraction } from "@/types/research";

function extraction(overrides: Partial<EntityExtraction> = {}): EntityExtraction {
  return {
    entities: [],
    topic: "",
    uncertainties: [],
    ambiguousRelationships: [],
    searchWorthy: true,
    trendTypeHint: "sports_event",
    ...overrides,
  };
}

describe("generateQueries", () => {
  it("Case 4 - produces no queries at all for a generic product", () => {
    const queries = generateQueries(
      extraction({ searchWorthy: false, trendTypeHint: "generic" }),
    );

    expect(queries).toEqual([]);
  });

  it("Case 4 - produces no queries even when searchWorthy is forced with no entities", () => {
    expect(generateQueries(extraction({ searchWorthy: true, entities: [] }))).toEqual([]);
  });

  it("Case 3 - builds relationship, context and year queries for two entities", () => {
    const queries = generateQueries(
      extraction({
        entities: [
          { name: "A'ja Wilson", type: "athlete" },
          { name: "Dawn Staley", type: "coach" },
        ],
        topic: "Ride to Dawn Staley",
        year: "2026",
        uncertainties: ["Meaning of 'Ride to Dawn Staley' is unclear"],
      }),
    );

    const types = queries.map((query) => query.type);

    expect(types).toContain("exact_phrase");
    expect(types).toContain("entity_relationship");
    expect(types).toContain("season_year");
    expect(queries.length).toBeLessThanOrEqual(10);
    expect(
      queries.some((query) => query.query.includes("A'ja Wilson") && query.query.includes("Dawn Staley")),
    ).toBe(true);
  });

  it("Case 2 - a tour product gets tour-flavoured queries, not event ones", () => {
    const queries = generateQueries(
      extraction({
        entities: [{ name: "Jonas Brothers", type: "artist" }],
        topic: "The Burning Up Tour All Over Again",
        trendTypeHint: "tour",
      }),
    );

    const types = queries.map((query) => query.type);

    expect(types).toContain("exact_phrase");
    expect(types).toContain("official_source");
    expect(types).not.toContain("social_viral");
    expect(types).not.toContain("season_year");
    expect(queries.some((query) => /tour/i.test(query.query))).toBe(true);
  });

  it("a single entity still yields a usable query set", () => {
    const queries = generateQueries(
      extraction({
        entities: [{ name: "Cleveland Guardians", type: "team" }],
        topic: "Cleveland Guardians",
        year: "2026",
      }),
    );

    expect(queries.length).toBeGreaterThan(0);
    expect(queries.every((query) => query.query.trim().length > 0)).toBe(true);
  });

  it("never emits duplicate query strings", () => {
    const queries = generateQueries(
      extraction({
        entities: [{ name: "Cleveland Guardians", type: "team" }],
        topic: "Cleveland Guardians",
      }),
    );

    const unique = new Set(queries.map((query) => query.query.toLowerCase()));
    expect(unique.size).toBe(queries.length);
  });
});
