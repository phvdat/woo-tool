import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findRevenueHistory: vi.fn(),
  getAccessibleWebsiteIds: vi.fn(),
}));

vi.mock("../revenueHistory", () => ({
  findRevenueHistory: mocks.findRevenueHistory,
}));

vi.mock("../websiteAccess", () => ({
  getAccessibleWebsiteIds: mocks.getAccessibleWebsiteIds,
}));

import { loadRevenueHistory } from "../loadRevenue";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getAccessibleWebsiteIds.mockResolvedValue(["site-a"]);
});

describe("loadRevenueHistory product search", () => {
  it("passes the search term to MongoDB and returns the whole order", async () => {
    const order = {
      websiteId: "site-a",
      website: "Shop",
      orderId: 1,
      customer: "Customer",
      total: 100,
      refunded: 0,
      revenue: 100,
      fee: 5,
      net: 95,
      status: "completed",
      date: "2026-11-20T10:00:00",
      paymentMethod: "stripe",
      products: [
        { productId: 10, name: "Space Jam Tee", quantity: 1 },
        { productId: 11, name: "Moonman Hoodie", quantity: 2 },
      ],
    };
    mocks.findRevenueHistory.mockResolvedValue([order]);

    const result = await loadRevenueHistory({
      websiteId: "all",
      userEmail: "owner@example.com",
      from: "2026-11-01T00:00:00Z",
      to: "2026-11-30T23:59:59Z",
      groupBy: "day",
      search: "Space Jam",
    });

    expect(mocks.findRevenueHistory).toHaveBeenCalledWith({
      websiteId: "all",
      userEmail: "owner@example.com",
      websiteIds: ["site-a"],
      from: "2026-11-01T00:00:00Z",
      to: "2026-11-30T23:59:59Z",
      search: "Space Jam",
    });
    expect(result.latestOrders).toHaveLength(1);
    expect(result.latestOrders[0].products).toHaveLength(2);
    expect(result.summary.totalOrders).toBe(1);
    expect(result.summary.totalRevenue).toBe(100);
  });
});
