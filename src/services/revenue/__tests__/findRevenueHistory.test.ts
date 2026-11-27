import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  connectToDatabase: vi.fn(),
  collection: vi.fn(),
  find: vi.fn(),
  sort: vi.fn(),
  toArray: vi.fn(),
}));

vi.mock("@/lib/mongodb", () => ({
  connectToDatabase: mocks.connectToDatabase,
}));

import { findRevenueHistory } from "../revenueHistory";

beforeEach(() => {
  vi.clearAllMocks();

  mocks.sort.mockReturnValue({ toArray: mocks.toArray });
  mocks.find.mockReturnValue({ sort: mocks.sort });
  mocks.collection.mockReturnValue({ find: mocks.find });
  mocks.connectToDatabase.mockResolvedValue({
    db: { collection: mocks.collection },
  });
  mocks.toArray.mockResolvedValue([]);
});

describe("findRevenueHistory product search", () => {
  it("matches product names with a partial, case-insensitive regex", async () => {
    await findRevenueHistory({
      userEmail: "owner@example.com",
      websiteIds: ["site-a"],
      from: "2026-01-01T00:00:00Z",
      to: "2026-12-31T23:59:59Z",
      search: "space jam",
    });

    expect(mocks.find).toHaveBeenCalledWith({
      $or: [
        { websiteId: { $in: ["site-a"] } },
        { ownerEmail: "owner@example.com" },
      ],
      date: {
        $gte: "2026-01-01T00:00:00Z",
        $lte: "2026-12-31T23:59:59Z",
      },
      "products.name": {
        $regex: "space jam",
        $options: "i",
      },
    });
  });

  it("escapes regex characters in the search term", async () => {
    await findRevenueHistory({
      userEmail: "owner@example.com",
      websiteIds: ["site-a"],
      search: "T-Shirt (2026) [SE]",
    });

    expect(mocks.find).toHaveBeenCalledWith(
      expect.objectContaining({
        "products.name": {
          $regex: "T-Shirt \\(2026\\) \\[SE\\]",
          $options: "i",
        },
      }),
    );
  });

  it("combines search with a single website filter", async () => {
    await findRevenueHistory({
      websiteId: "site-a",
      userEmail: "owner@example.com",
      websiteIds: ["site-a"],
      search: "Moonman",
    });

    expect(mocks.find).toHaveBeenCalledWith({
      websiteId: "site-a",
      "products.name": {
        $regex: "Moonman",
        $options: "i",
      },
    });
  });

  it("does not add a product filter for an empty search", async () => {
    await findRevenueHistory({
      userEmail: "owner@example.com",
      websiteIds: ["site-a"],
      search: "   ",
    });

    expect(mocks.find).toHaveBeenCalledWith({
      $or: [
        { websiteId: { $in: ["site-a"] } },
        { ownerEmail: "owner@example.com" },
      ],
    });
  });

  it("returns matching orders unchanged, including every line item", async () => {
    const order = {
      websiteId: "site-a",
      orderId: 1,
      products: [
        { productId: 10, name: "Space Jam Tee", quantity: 1 },
        { productId: 11, name: "Moonman Hoodie", quantity: 2 },
      ],
    };
    mocks.toArray.mockResolvedValue([order]);

    const result = await findRevenueHistory({
      userEmail: "owner@example.com",
      websiteIds: ["site-a"],
      search: "Space Jam",
    });

    expect(result).toEqual([order]);
    expect(result[0].products).toHaveLength(2);
    expect(mocks.sort).toHaveBeenCalledWith({ date: -1 });
  });

  it("returns one order document when several line items match the same name", async () => {
    const order = {
      websiteId: "site-a",
      orderId: 87843,
      products: [
        { productId: 60857, name: "Toronto Blue Jays Jersey", quantity: 1 },
        { productId: 60857, name: "Toronto Blue Jays Jersey", quantity: 1 },
      ],
    };
    mocks.toArray.mockResolvedValue([order]);

    const result = await findRevenueHistory({
      userEmail: "owner@example.com",
      websiteIds: ["site-a"],
      search: "Toronto Blue Jays",
    });

    expect(result).toEqual([order]);
    expect(result).toHaveLength(1);
    expect(result[0].products).toHaveLength(2);
    expect(mocks.collection).toHaveBeenCalled();
    expect(mocks.find).toHaveBeenCalledTimes(1);
  });
});
