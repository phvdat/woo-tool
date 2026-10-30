import { describe, expect, it } from "vitest";
import {
  classifyFetchError,
  classifyHttpStatus,
  normalizeCompetitorUrl,
} from "../websiteStatus";

describe("normalizeCompetitorUrl", () => {
  it("adds a missing scheme and strips trailing slashes", () => {
    expect(normalizeCompetitorUrl("example.com/shop/")).toBe(
      "https://example.com/shop",
    );
  });

  it("repairs JSON-escaped URLs", () => {
    expect(normalizeCompetitorUrl("https:\\/\\/example.com\\/shop\\/")).toBe(
      "https://example.com/shop",
    );
  });

  it("repairs percent-encoded URLs", () => {
    expect(
      normalizeCompetitorUrl("https%3A%2F%2Fexample.com%2Fshop%2F"),
    ).toBe("https://example.com/shop");
  });

  it("collapses extra slashes after the scheme", () => {
    expect(normalizeCompetitorUrl("https:/example.com/shop")).toBe(
      "https://example.com/shop",
    );
  });

  it("drops the hash and keeps the query string", () => {
    expect(normalizeCompetitorUrl("https://example.com/shop/?page=2#top")).toBe(
      "https://example.com/shop?page=2",
    );
  });

  it("rejects empty values and non-http protocols", () => {
    expect(normalizeCompetitorUrl("")).toBeNull();
    expect(normalizeCompetitorUrl("   ")).toBeNull();
    expect(normalizeCompetitorUrl("ftp://example.com")).toBeNull();
  });
});

describe("classifyHttpStatus", () => {
  it.each([200, 204, 301, 302, 399])("treats %i as alive", (status) => {
    expect(classifyHttpStatus(status)).toBe("alive");
  });

  it.each([404, 410])("treats %i as dead", (status) => {
    expect(classifyHttpStatus(status)).toBe("dead");
  });

  it.each([400, 401, 403, 429, 500, 502, 503, 504])(
    "treats %i as temporarily unavailable",
    (status) => {
      expect(classifyHttpStatus(status)).toBe("unavailable");
    },
  );
});

describe("classifyFetchError", () => {
  it("treats DNS not-found as dead", () => {
    expect(classifyFetchError({ cause: { code: "ENOTFOUND" } })).toBe("dead");
  });

  it("treats connection refused as dead", () => {
    expect(classifyFetchError({ code: "ECONNREFUSED" })).toBe("dead");
  });

  it("treats timeouts as temporarily unavailable", () => {
    expect(classifyFetchError({ name: "AbortError" })).toBe("unavailable");
    expect(classifyFetchError({ code: "UND_ERR_CONNECT_TIMEOUT" })).toBe(
      "unavailable",
    );
  });

  it("treats unknown network errors as temporarily unavailable", () => {
    expect(classifyFetchError(new Error("socket hang up"))).toBe(
      "unavailable",
    );
  });
});
