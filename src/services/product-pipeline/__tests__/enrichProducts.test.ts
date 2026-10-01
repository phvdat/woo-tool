import { beforeEach, describe, expect, it, vi } from "vitest";
import { enrichProducts } from "../enrichProducts";

const ask = vi.fn();
const researchBatch = vi.fn();
const validateDescription = vi.fn();
const buildDescriptionPrompt = vi.fn();
const shouldUseResearch = vi.fn();

vi.mock("@/services/ai/gemini", () => ({
  default: (prompt: string) => ask(prompt),
  geminiGrounded: vi.fn(),
}));

vi.mock("@/services/ai/chatgpt", () => ({
  default: (prompt: string) => ask(prompt),
}));

vi.mock("../socket", () => ({
  emitPipelineProgress: vi.fn(),
  PipelineStep: { AI: "AI" },
}));

vi.mock("../../research", () => ({
  researchBatch: (...args: unknown[]) => researchBatch(...args),
  validateDescription: (...args: unknown[]) => validateDescription(...args),
  buildDescriptionPrompt: (...args: unknown[]) => buildDescriptionPrompt(...args),
  shouldUseResearch: (...args: unknown[]) => shouldUseResearch(...args),
}));

const products = [
  {
    Name: "A'ja Wilson Tee",
    Categories: "Clothing > Unisex T-Shirts",
    Description: "(content)",
  },
] as any[];

const baseParams = {
  products,
  website: "Test Shop",
  apiKey: "sk-test",
  geminiApiKey: "gem-test",
  socketId: "socket-1",
  mixed: false,
  promptDescriptionProduct: "Write about {product-name}",
  promptTagsProduct: "Tag {{x}}",
};

beforeEach(() => {
  ask.mockReset();
  researchBatch.mockReset();
  validateDescription.mockReset();
  buildDescriptionPrompt.mockReset();
  shouldUseResearch.mockReset();

  ask.mockResolvedValue("A description written by the model. Short meta text.");
  buildDescriptionPrompt.mockReturnValue("PROMPT");
  researchBatch.mockResolvedValue(new Map());
  shouldUseResearch.mockReturnValue(false);
  validateDescription.mockReturnValue({ ok: true, reasons: [] });
});

describe("enrichProducts with research disabled", () => {
  it("never researches", async () => {
    await enrichProducts({ ...baseParams, researchEnabled: false });

    expect(researchBatch).not.toHaveBeenCalled();
  });

  it("publishes the model output untouched, with no validation or fallback", async () => {
    validateDescription.mockReturnValue({ ok: false, reasons: ["description is too short"] });

    const result = await enrichProducts({ ...baseParams, researchEnabled: false });

    // A failing check must not rewrite an existing store's description.
    expect(validateDescription).not.toHaveBeenCalled();
    expect(result[0].Description).toBe(
      "<p>A description written by the model. Short meta text.</p>",
    );
    expect(result[0]["Short description"]).toBe(
      "A description written by the model. Short meta text.",
    );
  });

  it("costs exactly two writes plus the tag call, as before", async () => {
    await enrichProducts({ ...baseParams, researchEnabled: false });

    expect(ask).toHaveBeenCalledTimes(3);
  });
});

describe("enrichProducts with research enabled", () => {
  const topic = { topicKey: "k", status: "completed" } as any;

  it("researches the batch and passes the topic to the prompt builder", async () => {
    researchBatch.mockResolvedValue(
      new Map([["a'ja wilson tee", topic]]),
    );
    shouldUseResearch.mockReturnValue(true);

    await enrichProducts({ ...baseParams, researchEnabled: true });

    expect(researchBatch).toHaveBeenCalledTimes(1);
    expect(researchBatch.mock.calls[0][0]).toHaveLength(1);
    expect(researchBatch.mock.calls[0][0][0]).toMatchObject({
      productName: "A'ja Wilson Tee",
      category: "Unisex T-Shirts",
    });
    expect(researchBatch.mock.calls[0][1]).toEqual({ geminiApiKey: "gem-test" });
    expect(buildDescriptionPrompt.mock.calls[0][0].topic).toBe(topic);
  });

  it("validates the description and regenerates once", async () => {
    researchBatch.mockResolvedValue(new Map([["a'ja wilson tee", topic]]));
    shouldUseResearch.mockReturnValue(true);
    validateDescription
      .mockReturnValueOnce({ ok: false, reasons: ["description is too short (10 words)"] })
      .mockReturnValueOnce({ ok: true, reasons: [] });

    const result = await enrichProducts({ ...baseParams, researchEnabled: true });

    expect(validateDescription).toHaveBeenCalledTimes(2);
    expect(result[0].Description).toBe(
      "<p>A description written by the model. Short meta text.</p>",
    );
  });

  it("falls back to a product-only description when the retry also fails", async () => {
    researchBatch.mockResolvedValue(new Map([["a'ja wilson tee", topic]]));
    shouldUseResearch.mockReturnValue(true);
    validateDescription.mockReturnValue({ ok: false, reasons: ["states event details"] });

    await enrichProducts({ ...baseParams, researchEnabled: true });

    const fallbackCall = ask.mock.calls.map((call) => call[0]).find((prompt) =>
      prompt.includes("Test Shop") && !prompt.includes("PROMPT"),
    );

    expect(fallbackCall).toBeDefined();
    expect(fallbackCall).toContain("A'ja Wilson Tee");
  });

  it("falls back only when research was actually used", async () => {
    researchBatch.mockResolvedValue(new Map([["a'ja wilson tee", topic]]));
    shouldUseResearch.mockReturnValue(false);
    validateDescription.mockReturnValue({ ok: false, reasons: ["anything"] });

    await enrichProducts({ ...baseParams, researchEnabled: true });

    expect(validateDescription).not.toHaveBeenCalled();
  });
});