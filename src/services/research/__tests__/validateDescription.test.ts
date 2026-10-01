import { describe, expect, it } from "vitest";
import { validateDescription } from "../validateDescription";

const product = {
  Name: "A'ja Wilson Custom Number Short Sleeve Hoodie",
  Categories: "Clothing > Unisex Hoodies",
} as any;

const good =
  "A'ja Wilson spent the season leading her team in scoring and closing out a run that " +
  "defined the group's recent era. Supporters followed every game of it, and the numbers " +
  "backed up the noise around the closing stretch. The hoodie carries that same focus, " +
  "cut for the days that run from the gym to the stands. Add a name and number at " +
  "checkout to make it yours.";

const withFabric = {
  Name: "A'ja Wilson Custom Number Short Sleeve Hoodie",
  Categories: "Clothing > Unisex Hoodies",
  Description: "Material: 100% cotton heavyweight fleece.",
} as any;

function check(description: string, hasResearch = true) {
  return validateDescription({ description, product, hasResearch });
}

function checkFabric(description: string) {
  return validateDescription({ description, product: withFabric, hasResearch: false });
}

describe("validateDescription", () => {
  it("accepts a researched description that stays inside the evidence", () => {
    expect(check(good)).toEqual({ ok: true, reasons: [] });
  });

  it("rejects an empty description", () => {
    expect(check("   ").reasons).toContain("description is empty");
  });

  it("rejects leaked research internals", () => {
    const result = check(`${good} According to our research, the team posted its best record.`);

    expect(result.ok).toBe(false);
    expect(result.reasons.join(" ")).toContain("research");
  });

  it("rejects a bare source URL", () => {
    expect(check(`${good} Source: https://apnews.com/x`).ok).toBe(false);
  });

  it("rejects fabricated specifications", () => {
    const result = check(
      `${good} This heavyweight fleece is 100% cotton with a relaxed fit, screen-printed and " +
        "machine washable, ships in 3 days.`,
    );

    expect(result.ok).toBe(false);
    expect(result.reasons.join(" ")).toMatch(/fabric|fit|printing|shipping|care/);
  });

  it("allows a specification that the product data actually states", () => {
    const result = checkFabric(`${good} The garment is made from 100% cotton fleece.`);

    expect(result.reasons).toEqual([]);
  });

  it("rejects the same specification when the product data does not state it", () => {
    const result = check(`${good} The garment is made from 100% cotton fleece.`, false);

    expect(result.reasons).toContain("unsupported fabric composition");
  });

  it("rejects a description that is only the title restated", () => {
    const result = check("A'ja Wilson Custom Number Short Sleeve Hoodie.");

    expect(result.ok).toBe(false);
    expect(result.reasons.join(" ")).toContain("repeats the title");
  });

  it("rejects a researched description that is too thin", () => {
    const result = check("A'ja Wilson led the team in scoring this season and fans loved it.");

    expect(result.ok).toBe(false);
    expect(result.reasons.join(" ")).toContain("too short");
  });

  it("flags unsupported event details even when the prose is fine", () => {
    const result = check(
      "A'ja Wilson was signed as a rookie and then clinched the championship after the " +
        "playoffs, adding a record that still stands today for anyone who watched the run.",
    );

    expect(result.ok).toBe(false);
    expect(result.reasons).toContain("states event details that need verification");
  });

  it("strips html before judging the text", () => {
    expect(check(`<p>${good}</p>`).ok).toBe(true);
  });
});