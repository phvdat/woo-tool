import { WebsiteConfig } from "@/types/woo";
import { askAI } from "../ai/client";
import { extractJson } from "../ai/extractJson";
import type {
    BlogArticle,
    SelectedTrend
} from "../blog/types";


export async function writeBlog(
    trend: SelectedTrend,
    website: WebsiteConfig
): Promise<BlogArticle> {

    const prompt = template
        .replaceAll("{{shopName}}", website.shopName)
        .replaceAll("{{keyword}}", trend.keyword)
        .replaceAll("{{reason}}", trend.reason)
        .replaceAll("{{customPrompt}}", website.autoBlog.prompt || defaultPrompt);

    const content = await askAI(prompt);

    return extractJson<BlogArticle>(content);
}


const template = `
You are an expert SEO content writer.

Write a high-quality English blog article.

Website:
{{shopName}}

Keyword:
{{keyword}}

Reason:
{{reason}}

Additional Instructions:
{{customPrompt}}

Requirements:

- 1200-1800 words.
- Output HTML only.
- Use <h2>, <h3>, <p>, <ul>, <li>, <strong>, <i>
- Include FAQ section.
- Include conclusion.
- Optimize naturally for SEO.
- Do not use Markdown.
- Do not mention AI.
- Do not invent fake statistics.

Return ONLY valid JSON.

{
  "title":"",
  "excerpt":"",
  "metaDescription":"",
  "tags":[],
  "content":""
}`

const defaultPrompt = `
Write for US readers.

The article must be original.

Prioritize evergreen SEO.

Use a friendly tone.

Include tables when appropriate.

Include FAQ.

Naturally mention collectible apparel, jerseys, hoodies, T-shirts or fan merchandise only when relevant.

Do not force product promotion.

Do not fabricate quotes or statistics.
`;