import { beforeEach, describe, expect, it, vi } from "vitest";
import { USERS_COLLECTION, WEBSITES_COLLECTION } from "@/constant/collections";

const mocks = vi.hoisted(() => ({
  buildProducts: vi.fn(),
  enrichProducts: vi.fn(),
  uploadProducts: vi.fn(),
  exportExcel: vi.fn(),
  sendTelegram: vi.fn(),
  sendTelegramMessage: vi.fn(),
  createVideoJobsFromPipeline: vi.fn(),
  connectToDatabase: vi.fn(),
  usersFindOne: vi.fn(),
  websitesFindOne: vi.fn(),
  categoriesToArray: vi.fn(),
}));

vi.mock("../buildProducts", () => ({
  buildProducts: mocks.buildProducts,
}));

vi.mock("../enrichProducts", () => ({
  enrichProducts: mocks.enrichProducts,
}));

vi.mock("../uploadProducts", () => ({
  uploadProducts: mocks.uploadProducts,
}));

vi.mock("../exportExcel", () => ({
  exportExcel: mocks.exportExcel,
}));

vi.mock("../../telegram/sendTelegram", () => ({
  sendTelegram: mocks.sendTelegram,
}));

vi.mock("../../telegram/sendTelegramMessage", () => ({
  sendTelegramMessage: mocks.sendTelegramMessage,
}));

vi.mock("../../video/createVideoJobsFromPipeline", () => ({
  createVideoJobsFromPipeline: mocks.createVideoJobsFromPipeline,
}));

vi.mock("@/lib/mongodb", () => ({
  connectToDatabase: mocks.connectToDatabase,
}));

vi.mock("@/helper/common", () => ({
  publishedTimeHelper: ({ products }: { products: unknown[] }) => products,
}));

import { runProductPipeline } from "../index";

const builtProducts = [{ Name: "Built product" }];
const enrichedProducts = [{ Name: "Enriched product" }];

const context = {
  file: {} as File,
  websiteId: "507f1f77bcf86cd799439011",
  userEmail: "owner@example.com",
  socketId: "site-1",
};

beforeEach(() => {
  vi.clearAllMocks();

  mocks.usersFindOne.mockResolvedValue({
    apiKey: "api-key",
    geminiApiKey: "gemini-key",
    telegramId: "telegram-id",
    mixed: false,
  });
  mocks.websitesFindOne.mockResolvedValue({
    _id: { toString: () => "site-1" },
    shopName: "shop",
    url: "https://shop.test",
    product: { publicTime: 0, gapFrom: 0, gapTo: 0 },
    autoVideo: { enabled: true },
  });
  mocks.categoriesToArray.mockResolvedValue([]);
  mocks.buildProducts.mockResolvedValue(builtProducts);
  mocks.enrichProducts.mockResolvedValue(enrichedProducts);
  mocks.uploadProducts.mockResolvedValue({ productIds: [101] });
  mocks.exportExcel.mockResolvedValue({
    fileName: "shop-AI.csv",
    filePath: "shop-AI.csv",
  });
  mocks.sendTelegram.mockResolvedValue(undefined);
  mocks.sendTelegramMessage.mockResolvedValue(undefined);
  mocks.createVideoJobsFromPipeline.mockResolvedValue({
    created: 1,
    errors: 0,
  });

  mocks.connectToDatabase.mockResolvedValue({
    db: {
      collection: vi.fn((name: string) => {
        if (name === USERS_COLLECTION) {
          return { findOne: mocks.usersFindOne };
        }
        if (name === WEBSITES_COLLECTION) {
          return { findOne: mocks.websitesFindOne };
        }
        return {
          find: vi.fn(() => ({ toArray: mocks.categoriesToArray })),
        };
      }),
    },
  });
});

describe("runProductPipeline process selection", () => {
  it("runs all three stages by default", async () => {
    const result = await runProductPipeline(context);

    expect(result).toBe(enrichedProducts);
    expect(mocks.buildProducts).toHaveBeenCalledTimes(1);
    expect(mocks.enrichProducts).toHaveBeenCalledTimes(1);
    expect(mocks.uploadProducts).toHaveBeenCalledTimes(1);
    expect(mocks.exportExcel).toHaveBeenCalledWith({
      products: enrichedProducts,
      website: "shop",
    });
    expect(mocks.sendTelegram).toHaveBeenCalledTimes(1);
    expect(mocks.createVideoJobsFromPipeline).toHaveBeenCalledTimes(1);
    expect(
      mocks.exportExcel.mock.invocationCallOrder[0],
    ).toBeGreaterThan(mocks.uploadProducts.mock.invocationCallOrder[0]);
  });

  it("runs build only without enriching or uploading", async () => {
    const result = await runProductPipeline({
      ...context,
      processes: {
        buildProducts: true,
        enrichProducts: false,
        uploadProducts: false,
      },
    });

    expect(result).toBe(builtProducts);
    expect(mocks.buildProducts).toHaveBeenCalledTimes(1);
    expect(mocks.enrichProducts).not.toHaveBeenCalled();
    expect(mocks.uploadProducts).not.toHaveBeenCalled();
    expect(mocks.createVideoJobsFromPipeline).not.toHaveBeenCalled();
    expect(mocks.exportExcel).toHaveBeenCalledWith({
      products: builtProducts,
      website: "shop",
    });
    expect(mocks.sendTelegram).toHaveBeenCalledTimes(1);
  });

  it("runs build and enrich without uploading", async () => {
    const result = await runProductPipeline({
      ...context,
      processes: {
        buildProducts: true,
        enrichProducts: true,
        uploadProducts: false,
      },
    });

    expect(result).toBe(enrichedProducts);
    expect(mocks.enrichProducts).toHaveBeenCalledTimes(1);
    expect(mocks.uploadProducts).not.toHaveBeenCalled();
    expect(mocks.createVideoJobsFromPipeline).not.toHaveBeenCalled();
    expect(mocks.exportExcel).toHaveBeenCalledWith({
      products: enrichedProducts,
      website: "shop",
    });
  });

  it("runs build and upload without enriching", async () => {
    const result = await runProductPipeline({
      ...context,
      processes: {
        buildProducts: true,
        enrichProducts: false,
        uploadProducts: true,
      },
    });

    expect(result).toBe(builtProducts);
    expect(mocks.enrichProducts).not.toHaveBeenCalled();
    expect(mocks.uploadProducts).toHaveBeenCalledTimes(1);
    expect(mocks.exportExcel).toHaveBeenCalledWith({
      products: builtProducts,
      website: "shop",
    });
    expect(mocks.createVideoJobsFromPipeline).toHaveBeenCalledWith({
      websiteId: context.websiteId,
      productIds: [101],
      website: expect.objectContaining({ shopName: "shop" }),
    });
  });

  it("defaults missing flags to true", async () => {
    await runProductPipeline({
      ...context,
      processes: { enrichProducts: false },
    });

    expect(mocks.buildProducts).toHaveBeenCalledTimes(1);
    expect(mocks.enrichProducts).not.toHaveBeenCalled();
    expect(mocks.uploadProducts).toHaveBeenCalledTimes(1);
  });

  it("rejects enrich or upload without build", async () => {
    await expect(
      runProductPipeline({
        ...context,
        processes: {
          buildProducts: false,
          enrichProducts: true,
          uploadProducts: false,
        },
      }),
    ).rejects.toThrow(
      "Build Products is required before Enrich Products or Upload Products.",
    );

    expect(mocks.connectToDatabase).not.toHaveBeenCalled();
  });

  it("rejects running with no stages selected", async () => {
    await expect(
      runProductPipeline({
        ...context,
        processes: {
          buildProducts: false,
          enrichProducts: false,
          uploadProducts: false,
        },
      }),
    ).rejects.toThrow("Select at least one process to run.");

    expect(mocks.connectToDatabase).not.toHaveBeenCalled();
  });
});
