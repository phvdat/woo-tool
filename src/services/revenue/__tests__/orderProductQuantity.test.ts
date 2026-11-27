import { describe, expect, it } from "vitest";
import { getOrderProductQuantity } from "../orderProductQuantity";

describe("getOrderProductQuantity", () => {
  it("reads the quantity from the order line item", () => {
    expect(getOrderProductQuantity({ quantity: 1 })).toBe(1);
    expect(getOrderProductQuantity({ quantity: 3 })).toBe(3);
  });

  it("does not fall back to a cross-order product total", () => {
    // The hovered line item is one unit even when the filtered productStats
    // aggregate for the same product is larger.
    const hoveredLineItem = { quantity: 1, productStatsQuantity: 2 };

    expect(getOrderProductQuantity(hoveredLineItem)).toBe(1);
  });

  it("treats a missing or invalid quantity as zero", () => {
    expect(getOrderProductQuantity({ quantity: undefined as any })).toBe(0);
    expect(getOrderProductQuantity({ quantity: "n/a" as any })).toBe(0);
  });
});
