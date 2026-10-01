import { describe, expect, it } from "vitest";
import {
  buildProvisionalTopicKey,
  buildTopicKey,
  registrableDomain,
  resolveFreshnessMs,
  substantiveTokens,
} from "../topicKey";

const aja = [
  { name: "A'ja Wilson", type: "athlete" },
  { name: "Dawn Staley", type: "coach" },
];

describe("substantiveTokens", () => {
  it("drops apparel, marketing and customization words", () => {
    const tokens = substantiveTokens("Custom Name Number Short Sleeve Hoodie Jersey");

    expect(tokens).not.toContain("custom");
    expect(tokens).not.toContain("hoodie");
    expect(tokens).not.toContain("jersey");
    expect(tokens).not.toContain("sleeve");
    expect(tokens).not.toContain("number");
  });
});

describe("buildProvisionalTopicKey", () => {
  it("Case 3 - normalizes an ambiguous multi-entity title", () => {
    expect(buildProvisionalTopicKey(aja, "2026")).toBe("aja-wilson-dawn-staley-2026");
  });

  it("returns an empty key when nothing substantive remains", () => {
    expect(buildProvisionalTopicKey([])).toBe("");
    expect(
      buildProvisionalTopicKey([{ name: "Hoodie", type: "product" }]),
    ).toBe("");
  });

  it("ignores a year that is not four digits", () => {
    expect(buildProvisionalTopicKey(aja, "nineteen")).toBe("aja-wilson-dawn-staley");
  });
});

describe("buildTopicKey", () => {
  it("Case 2 - separates different events involving the same people", () => {
    const championship = buildTopicKey({
      entities: aja,
      event: "championship",
      season: "2026",
    });
    const allStar = buildTopicKey({
      entities: aja,
      event: "all star game",
      season: "2026",
    });

    expect(championship).toBe("aja-wilson-dawn-staley-2026-championship");
    expect(allStar).toBe("aja-wilson-dawn-staley-2026-all-star-game");
    expect(championship).not.toBe(allStar);
  });

  it("falls back to entities plus season when the event is unknown", () => {
    expect(
      buildTopicKey({ entities: aja, season: "2026" }),
    ).toBe("aja-wilson-dawn-staley-2026");
  });
});

describe("registrableDomain", () => {
  it("collapses subdomains and www", () => {
    expect(registrableDomain("https://www.espn.com/nfl/story/1")).toBe("espn.com");
    expect(registrableDomain("https://news.bbc.co.uk/sport")).toBe("bbc.co.uk");
  });
});

describe("resolveFreshnessMs", () => {
  it("shortens freshness for active trends and breaking events", () => {
    const evergreen = resolveFreshnessMs("franchise");
    const active = resolveFreshnessMs("sports_event");
    const breaking = resolveFreshnessMs("sports_event", true);

    expect(breaking).toBeLessThan(active);
    expect(active).toBeLessThan(evergreen);
  });

  it("uses the evergreen window for stable subjects", () => {
    expect(resolveFreshnessMs("brand")).toBe(resolveFreshnessMs("franchise"));
  });
});
