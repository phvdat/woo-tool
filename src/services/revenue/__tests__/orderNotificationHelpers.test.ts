import { describe, expect, it } from "vitest";
import {
  buildOrderNotificationMessage,
  getLatestOrderCursor,
  selectOrdersAfterCursor,
} from "../orderNotificationHelpers";

const cursor = "2026-01-01T10:00:00.000Z";

const orders = [
  { id: 1, date_created_gmt: "2026-01-01T09:00:00" },
  { id: 2, date_created_gmt: "2026-01-01T10:30:00" },
  { id: 3, date_created_gmt: "2026-01-01T11:00:00" },
];

describe("revenue order notification cursor", () => {
  it("selects only orders newer than the cursor, oldest first", () => {
    expect(selectOrdersAfterCursor(orders, cursor).map((order) => order.id)).toEqual([
      2, 3,
    ]);
  });

  it("recovers every missed order regardless of how old the cursor is", () => {
    const dayOldCursor = "2025-12-31T10:00:00.000Z";

    expect(
      selectOrdersAfterCursor(orders, dayOldCursor).map((order) => order.id)
    ).toEqual([1, 2, 3]);
  });

  it("advances to the latest fetched order", () => {
    expect(getLatestOrderCursor(orders, cursor)).toBe(
      "2026-01-01T11:00:00.000Z"
    );
  });

  it("keeps the fallback when no orders were fetched", () => {
    expect(getLatestOrderCursor([], cursor)).toBe(cursor);
  });
});

describe("revenue order notification message", () => {
  it("includes the website, order, total, payment, status, time and products", () => {
    const message = buildOrderNotificationMessage("Demo Shop", {
      id: 42,
      number: "42",
      total: "19.99",
      currency: "USD",
      payment_method_title: "Stripe",
      status: "processing",
      date_created: "2026-01-01T17:00:00",
      line_items: [
        { name: "Tee <Large>", quantity: 2 },
        { name: "Mug", quantity: 1 },
      ],
    });

    expect(message).toContain("Website: <b>Demo Shop</b>");
    expect(message).toContain("Order: #42");
    expect(message).toContain("Total: 19.99 USD");
    expect(message).toContain("Payment: Stripe");
    expect(message).toContain("Status: processing");
    expect(message).toContain("Created: 2026-01-01T17:00:00");
    expect(message).toContain("• Tee &lt;Large&gt; x2");
    expect(message).toContain("• Mug x1");
  });
});
