import { describe, expect, it } from "vitest";
import {
  buildSpyProductIdentity,
  buildSpyProductMatch,
  normalizeSpyExternalId,
  normalizeSpyUrl,
} from "../identity";

describe("normalizeSpyUrl", () => {
  it("lowercases, strips the hash and trailing slashes", () => {
    expect(normalizeSpyUrl("HTTPS://Example.COM/Product/Cool-Shirt/#reviews")).toBe(
      "https://example.com/product/cool-shirt",
    );
  });

  it("treats URLs that only differ by hash/trailing slash as the same", () => {
    expect(normalizeSpyUrl("https://shop.test/product/a/")).toBe(
      normalizeSpyUrl("https://shop.test/product/a#description"),
    );
  });

  it("drops default ports via URL canonicalisation", () => {
    expect(normalizeSpyUrl("https://shop.test:443/product/a")).toBe(
      "https://shop.test/product/a",
    );
  });

  it("returns undefined for empty values", () => {
    expect(normalizeSpyUrl("")).toBeUndefined();
    expect(normalizeSpyUrl("   ")).toBeUndefined();
    expect(normalizeSpyUrl(null)).toBeUndefined();
    expect(normalizeSpyUrl(undefined)).toBeUndefined();
  });
});

describe("normalizeSpyExternalId", () => {
  it("trims ids and drops empty values", () => {
    expect(normalizeSpyExternalId(" 42 ")).toBe("42");
    expect(normalizeSpyExternalId(42)).toBe("42");
    expect(normalizeSpyExternalId("")).toBeUndefined();
    expect(normalizeSpyExternalId(null)).toBeUndefined();
  });
});

describe("buildSpyProductIdentity", () => {
  it("prefers the URL for dedupeKey so URL-only and URL+id rows agree", () => {
    const withId = buildSpyProductIdentity({
      title: "Cool Shirt",
      url: "https://shop.test/product/cool-shirt/",
      externalId: "42",
      source: "woocommerce",
    });
    const withoutId = buildSpyProductIdentity({
      title: "Cool Shirt",
      url: "https://shop.test/product/cool-shirt",
      source: "generic",
    });

    expect(withId.dedupeKey).toBe(withoutId.dedupeKey);
    expect(withId.dedupeKey).toBe("url:https://shop.test/product/cool-shirt");
    expect(withId.externalId).toBe("42");
  });

  it("falls back to the external id when there is no URL", () => {
    const identity = buildSpyProductIdentity({
      title: "No URL",
      url: "",
      externalId: "sku-1",
      source: "shopify",
    });

    expect(identity.dedupeKey).toBe("id:sku-1");
    expect(identity.normalizedUrl).toBeUndefined();
  });

  it("falls back to title+price for malformed adapter output", () => {
    const identity = buildSpyProductIdentity({
      title: "  Fallback Product ",
      url: "",
      price: "19.99",
      source: "generic",
    });

    expect(identity.dedupeKey).toBe("title:fallback product|19.99");
  });
});

describe("buildSpyProductMatch", () => {
  it("matches the dedupe key plus every available identity field", () => {
    const identity = buildSpyProductIdentity({
      title: "Cool Shirt",
      url: "https://shop.test/product/cool-shirt/",
      externalId: "42",
      source: "woocommerce",
    });

    expect(buildSpyProductMatch("competitor-1", identity)).toEqual({
      competitorId: "competitor-1",
      $or: [
        { dedupeKey: "url:https://shop.test/product/cool-shirt" },
        { externalId: "42" },
        { normalizedUrl: "https://shop.test/product/cool-shirt" },
      ],
    });
  });
});
