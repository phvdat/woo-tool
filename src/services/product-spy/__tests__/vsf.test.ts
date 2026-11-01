import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("axios");

import axios from "axios";
import { fetchVsFProducts } from "../vsf";

const getMock = axios.get as unknown as {
  mockReset: () => void;
  mockImplementation: (fn: (url: string, config: { params: Record<string, unknown> }) => Promise<unknown>) => void;
};

function source(index: number) {
  return {
    id: `p-${index}`,
    name: `Product ${index}`,
    url_key: `product-${index}`,
    created_at: new Date(Date.UTC(2026, 0, 1) + index * 1000).toISOString(),
    final_price: 19.99,
    image: `/img/${index}.jpg`,
  };
}

describe("fetchVsFProducts pagination", () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it("reaches products beyond the first 1,000 when earlier pages are known", async () => {
    const total = 1100;

    getMock.mockImplementation(async (_url, config) => {
      const from = Number(config.params.from ?? 0);
      const size = Number(config.params.size ?? 100);
      const count = Math.max(0, Math.min(size, total - from));
      const hits = Array.from({ length: count }, (_, offset) => ({
        _id: `p-${from + offset}`,
        _source: source(from + offset),
      }));

      return {
        status: 200,
        data: { hits: { total: { value: total }, hits } },
      };
    });

    const result = await fetchVsFProducts("https://store.example", {
      isKnown: (externalId) => Number(externalId.replace("p-", "")) < 1000,
    });

    const newIds = result.products
      .map((product) => product.externalId)
      .filter((id): id is string => Boolean(id))
      .filter((id) => Number(id.replace("p-", "")) >= 1000);

    expect(result.hasProducts).toBe(true);
    expect(result.complete).toBe(true);
    expect(newIds).toHaveLength(100);
    expect(newIds[0]).toBe("p-1000");
    expect(newIds.at(-1)).toBe("p-1099");
    expect(result.debug.join(" ")).toContain("1100 product(s), 100 new");
  });
});
