import { describe, expect, it } from "vitest";
import {
  BASELINE_FALLBACK_FIRST_SEEN_AT,
  baselineFirstSeenAt,
  canCompleteBaseline,
  needsBaseline,
} from "../baseline";

const crawlStartedAt = "2026-10-31T12:00:00.000Z";

describe("needsBaseline", () => {
  it("treats an explicitly new competitor as needing a baseline", () => {
    expect(needsBaseline({ baselineStatus: "new" })).toBe(true);
  });

  it("does not re-baseline an active competitor", () => {
    expect(needsBaseline({ baselineStatus: "active" })).toBe(false);
  });

  it("treats legacy competitors without the field as active", () => {
    expect(needsBaseline({})).toBe(false);
  });
});

describe("baselineFirstSeenAt", () => {
  it("uses a real historical product date when it is safely pre-baseline", () => {
    expect(
      baselineFirstSeenAt(
        { dateCreated: "2024-03-15T08:30:00.000Z" },
        crawlStartedAt,
      ),
    ).toBe("2024-03-15T08:30:00.000Z");
  });

  it("does not use a date from the last 24 hours", () => {
    expect(
      baselineFirstSeenAt(
        { dateCreated: "2026-10-31T09:00:00.000Z" },
        crawlStartedAt,
      ),
    ).toBe(BASELINE_FALLBACK_FIRST_SEEN_AT);
  });

  it("does not use a future date", () => {
    expect(
      baselineFirstSeenAt(
        { dateCreated: "2026-11-05T00:00:00.000Z" },
        crawlStartedAt,
      ),
    ).toBe(BASELINE_FALLBACK_FIRST_SEEN_AT);
  });

  it("falls back when the product has no usable date", () => {
    expect(baselineFirstSeenAt({}, crawlStartedAt)).toBe(
      BASELINE_FALLBACK_FIRST_SEEN_AT,
    );
    expect(
      baselineFirstSeenAt({ dateCreated: "not-a-date" }, crawlStartedAt),
    ).toBe(BASELINE_FALLBACK_FIRST_SEEN_AT);
  });

  it("keeps the fallback safely in the past", () => {
    expect(new Date(BASELINE_FALLBACK_FIRST_SEEN_AT).getTime()).toBeLessThan(
      new Date(crawlStartedAt).getTime(),
    );
  });
});

describe("canCompleteBaseline", () => {
  it("requires at least one product", () => {
    expect(canCompleteBaseline([], true)).toBe(false);
  });

  it("completes when the adapter did not report a partial result", () => {
    expect(canCompleteBaseline([{ title: "a" }], true)).toBe(true);
    expect(canCompleteBaseline([{ title: "a" }], undefined)).toBe(true);
  });

  it("refuses to complete a partial baseline", () => {
    expect(canCompleteBaseline([{ title: "a" }], false)).toBe(false);
  });
});
