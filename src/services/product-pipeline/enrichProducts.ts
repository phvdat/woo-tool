import { DEFAULT_PROMPT_DESCRIPTION, DEFAULT_PROMPT_TAGS } from "@/constant/commons";
import chatgpt from "@/services/ai/chatgpt";
import { AIProvider, WooCommerce } from "@/types/woo";
import { shuffle } from "lodash";
import { emitPipelineProgress, PipelineStep } from "./socket";
import gemini from "../ai/gemini";

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
}: EnrichProductsParams): Promise<WooCommerce[]> {
  const result: WooCommerce[] = [];

  const ask = async (prompt: string) =>
    aiProvider === "chatgpt" ? chatgpt(prompt, apiKey) : gemini(prompt, geminiApiKey);

  for (let index = 0; index < products.length; index++) {
    const product = products[index];

    const categoryRaw = product.Categories || "";
    const category = categoryRaw.split(">").pop()?.trim() || "";

    const question = promptDescriptionProduct
      .replaceAll("{product-name}", product.Name)
      .replaceAll("{category}", category)
      .replaceAll("{website}", website);

    const aiContent = await ask(question);
    const description = product.Description.replace(
      "(content)",
      `<p>${aiContent}</p>`,
    )
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