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

import { buildProductStatKey } from "../aggregateProducts";
import { loadRevenueHistory } from "../loadRevenue";
import { getOrderProductQuantity } from "../orderProductQuantity";

const PRODUCT_NAME =
  "Toronto Blue Jays x One Piece Jersey 2026 Luffy Gear 5";
const PARTIAL_PRODUCT_NAME = "Toronto Blue Jays";

function makeOrder(orderId: number) {
  return {
    websiteId: "site-a",
    ownerEmail: "owner@example.com",
    orderId,
    website: "Teesculture.com",
    customer: "Katelyn Garland",
    total: 53.49,
    refunded: 0,
    revenue: 53.49,
    fee: 2.65,
    net: 50.84,
    status: "processing",
    date: "2026-11-27T03:52:46",
    paymentMethod: "paypal",
    products: [
      {
        productId: 60857,
        name: PRODUCT_NAME,
        image: "",
        link: "",
        quantity: 1,
        lineItemId: orderId,
        unitPrice: 38.5,
        lineTotal: 38.5,
      },
    ],
    createdAt: new Date("2026-11-27T03:52:46Z"),
    updatedAt: new Date("2026-11-27T03:52:46Z"),
  };
}

// #87843 and an older order contain the same product, one unit each.
const order87843 = makeOrder(87843);
const olderOrder = makeOrder(69591);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getAccessibleWebsiteIds.mockResolvedValue(["site-a"]);
  mocks.findRevenueHistory.mockImplementation(async ({ search }: any) => {
    if (!search) return [order87843, olderOrder];
    // Both the exact name and the partial name match #87843 in this fixture.
    return [order87843];
  });
});

function load(search?: string) {
  return loadRevenueHistory({
    websiteId: "all",
    userEmail: "owner@example.com",
    from: "2026-01-01T00:00:00Z",
    to: "2026-12-31T23:59:59Z",
    groupBy: "day",
    search,
  });
}

function order87843From(result: Awaited<ReturnType<typeof load>>) {
  const order = result.latestOrders.find((item) => item.id === 87843);
  if (!order) throw new Error("Order #87843 was not returned");
  return order;
}

describe("product-name search keeps order #87843 quantity at 1", () => {
  it("returns the same order and line item without search, exact search and partial search", async () => {
    const withoutSearch = await load();
    const withExactSearch = await load(PRODUCT_NAME);
    const withPartialSearch = await load(PARTIAL_PRODUCT_NAME);

    for (const result of [withoutSearch, withExactSearch, withPartialSearch]) {
      const order = order87843From(result);
      expect(order.products).toHaveLength(1);
      expect(order.products[0]).toMatchObject({
        productId: 60857,
        name: PRODUCT_NAME,
        quantity: 1,
        lineItemId: 87843,
      });
      expect(order.revenue).toBe(53.49);
      expect(getOrderProductQuantity(order.products[0])).toBe(1);
    }

    expect(withExactSearch.latestOrders).toEqual(
      withoutSearch.latestOrders.filter((item) => item.id === 87843),
    );
    expect(withPartialSearch.latestOrders).toEqual(
      withExactSearch.latestOrders,
    );
  });

  it("does not use the filtered product aggregate as the order line item quantity", async () => {
    const withoutSearch = await load();
    const withExactSearch = await load(PRODUCT_NAME);
    const key = buildProductStatKey("site-a", 60857, PRODUCT_NAME);

    // Product stats are totals across the filtered orders, so they change with
    // the search. The hovered order line item must not follow them.
    expect(withoutSearch.productStats.find((stat) => stat.key === key)?.quantity).toBe(2);
    expect(withExactSearch.productStats.find((stat) => stat.key === key)?.quantity).toBe(1);

    expect(getOrderProductQuantity(order87843From(withoutSearch).products[0])).toBe(1);
    expect(getOrderProductQuantity(order87843From(withExactSearch).products[0])).toBe(1);
    expect(getOrderProductQuantity(order87843From(await load(PARTIAL_PRODUCT_NAME)).products[0])).toBe(1);
  });

  it("passes the search term through as an order filter only", async () => {
    await load(PRODUCT_NAME);
    expect(mocks.findRevenueHistory).toHaveBeenCalledWith(
      expect.objectContaining({ search: PRODUCT_NAME }),
    );

    await load(PARTIAL_PRODUCT_NAME);
    expect(mocks.findRevenueHistory).toHaveBeenCalledWith(
      expect.objectContaining({ search: PARTIAL_PRODUCT_NAME }),
    );
  });
});
