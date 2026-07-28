import { DEFAULT_PROMPT_DESCRIPTION, DEFAULT_PROMPT_TAGS } from "@/constant/commons";
import chatgpt from "@/services/chatgpt";
import { WooCommerce } from "@/types/woo";
import { shuffle } from "lodash";
import { emitPipelineProgress, PipelineStep } from "./socket";

interface EnrichProductsParams {
  products: WooCommerce[];
  website: string;
  apiKey: string;
  socketId: string;
  mixed: boolean;
  promptDescriptionProduct?: string;
  promptTagsProduct?: string;
}

export async function enrichProducts({
  products,
  website,
  apiKey,
  socketId,
  mixed,
  promptDescriptionProduct = DEFAULT_PROMPT_DESCRIPTION,
  promptTagsProduct = DEFAULT_PROMPT_TAGS,
}: EnrichProductsParams): Promise<WooCommerce[]> {
  const result: WooCommerce[] = [];

  for (let index = 0; index < products.length; index++) {
    const product = products[index];

    const categoryRaw = product.Categories || "";
    const category = categoryRaw.split(">").pop()?.trim() || "";

    const question = promptDescriptionProduct
      .replaceAll("{product-name}", product.Name)
      .replaceAll("{category}", category)
      .replaceAll("{website}", website);

    const aiContent = await chatgpt(question, apiKey);

    result.push({
      ...product,
      Description: product.Description.replace(
        "(content)",
        `<p>${aiContent}</p>`,
      ),
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

  const tagsRaw = await chatgpt(tagPrompt, apiKey);

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