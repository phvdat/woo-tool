import { DEFAULT_PROMPT_DESCRIPTION, DEFAULT_PROMPT_TAGS } from "@/constant/commons";
import { FALLBACK_DESCRIPTION_PROMPT } from "@/constant/researchPrompts";
import chatgpt from "@/services/ai/chatgpt";
import { AIProvider, WooCommerce } from "@/types/woo";
import { shuffle } from "lodash";
import { emitPipelineProgress, PipelineStep } from "./socket";
import gemini from "../ai/gemini";
import {
  buildDescriptionPrompt,
  researchBatch,
  shouldUseResearch,
  validateDescription,
} from "../research";
import { ResearchTopic } from "@/types/research";

interface EnrichProductsParams {
  products: WooCommerce[];
  website: string;
  apiKey: string;
  geminiApiKey?: string;
  socketId: string;
  mixed: boolean;
  aiProvider?: AIProvider;
  promptDescriptionProduct?: string;
  promptTagsProduct?: string;
  researchEnabled?: boolean;
}

function categoryOf(product: WooCommerce): string {
  const categoryRaw = product.Categories || "";
  return categoryRaw.split(">").pop()?.trim() || "";
}

function injectContent(product: WooCommerce, content: string): string {
  return product.Description.replace("(content)", `<p>${content}</p>`);
}

export async function enrichProducts({
  products,
  website,
  apiKey,
  geminiApiKey,
  socketId,
  mixed,
  aiProvider = "gemini",
  promptDescriptionProduct = DEFAULT_PROMPT_DESCRIPTION,
  promptTagsProduct = DEFAULT_PROMPT_TAGS,
  researchEnabled = false,
}: EnrichProductsParams): Promise<WooCommerce[]> {
  const result: WooCommerce[] = [];

  const ask = async (prompt: string) =>
    aiProvider === "chatgpt" ? chatgpt(prompt, apiKey) : gemini(prompt, geminiApiKey);

  // One pass over the batch, keyed by product name. Research is topic-scoped, so
  // a T-shirt and a hoodie about the same event share a single research pass.
  // Research always runs on Gemini's grounded call regardless of the store's
  // `aiProvider`, which only selects the description and tag writer.
  const researchByProduct: Map<string, ResearchTopic> = researchEnabled
    ? await researchBatch(
        products.map((product) => ({
          productName: product.Name,
          category: categoryOf(product),
          description: product.Description,
          website,
        })),
        { geminiApiKey },
      )
    : new Map<string, ResearchTopic>();

  for (let index = 0; index < products.length; index++) {
    const product = products[index];
    const topic = researchByProduct.get((product.Name || "").trim().toLowerCase());
    const useResearch = shouldUseResearch(topic);

    const question = buildDescriptionPrompt({
      storePrompt: promptDescriptionProduct,
      product,
      website,
      topic,
    });

    let aiContent = await ask(question);

    // The check only runs when research actually fed this prompt. With research
    // off the description goes straight through, exactly as it did before the
    // feature existed, so no existing store's tone can be silently rewritten.
    if (useResearch) {
      let validation = validateDescription({
        description: aiContent,
        product,
        hasResearch: true,
      });

      // One regeneration, then a conservative description built only from the
      // product name. Never a second guess at the research, which is what the
      // first attempt already got wrong.
      if (!validation.ok) {
        console.warn(
          `[PIPELINE] description check failed for "${product.Name}": ${validation.reasons.join("; ")}`,
        );

        aiContent = await ask(question);

        validation = validateDescription({
          description: aiContent,
          product,
          hasResearch: true,
        });
      }

      if (!validation.ok) {
        console.warn(
          `[PIPELINE] using fallback description for "${product.Name}": ${validation.reasons.join("; ")}`,
        );

        aiContent = await ask(
          FALLBACK_DESCRIPTION_PROMPT.replaceAll("{{productName}}", product.Name)
            .replaceAll("{{category}}", categoryOf(product))
            .replaceAll("{{website}}", website),
        );
      }
    }

    const description = injectContent(product, aiContent);

    const shortDescription = await ask(SHORT_DESCRIPTION_PROMPT.replaceAll("{{description}}", description.replace(/<[^>]*>/g, " "))) || ""

    result.push({
      ...product,
      Description: description,
      "Short description": shortDescription,
    });

    emitPipelineProgress({
      socketId,
      step: PipelineStep.AI,
      percent: Math.floor(((index + 1) / products.length) * 100),
      currentRow: index + 1,
      totalRows: products.length,
    });
  }

  const productNames = result.map((item) => item.Name).join("\n");

  const tagPrompt =
    promptTagsProduct +
    `

Product list:
${productNames}

Remember:
- Output ONLY tags
- Separate each product with "|"
`;

  const tagsRaw = await ask(tagPrompt);

  const cleanText =
    tagsRaw
      ?.replace(/```/g, "")
      .replace(/output\s*:/gi, "")
      .trim() || "";

  const tags = cleanText.split("|").map((item) => item.trim());

  const productsWithTags = result.map((item, index) => ({
    ...item,
    Tags: tags[index] || "",
  }));

  return mixed ? shuffle(productsWithTags) : productsWithTags;
}

const SHORT_DESCRIPTION_PROMPT = `
Write a unique SEO meta description from the product description below.

- 1 natural sentence, ideally 120-155 characters.
- Use only provided information.
- Focus on the design, theme, style, or key features.
- No keyword stuffing, hype, or invented information.
- Ignore HTML.
- Output only the description.

{{description}}
`;
