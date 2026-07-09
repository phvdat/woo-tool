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
You are a professional SEO content writer for a US audience.
Write one original blog article about the topic below.
Website:
{{shopName}}
Target keyword:
{{keyword}}
Why this topic is trending:
{{reason}}
Additional instructions:
{{customPrompt}}
Requirements:
- Write 800-1000 words.
- Return HTML only inside the content field.
- Use only these HTML tags:
  <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>
- Write a compelling introduction.
- Include exactly 4-6 H2 sections.
- Use H3 only when necessary (maximum 2).
- Include at most ONE unordered list.
- Do NOT generate tables.
- Include exactly 3 FAQ questions.
- Write a short conclusion (under 80 words).
- Keep paragraphs short (2-4 sentences).
- Avoid repeating ideas.
- Every section must provide new information.
- Optimize naturally for SEO.
- Mention the target keyword naturally.
- Do not use Markdown.
- Do not mention AI.
- Do not fabricate quotes, statistics or facts.
- If information is uncertain, write in a general way instead of making up details.
Return ONLY valid JSON.
{
  "title":"",
  "metaDescription":"",
  "tags":[],
  "content":""
}
`;

const defaultPrompt = `
Write for readers in the United States.
Use a friendly, informative tone.
Focus on evergreen information whenever possible.
Do not add filler sections just to increase length.
Avoid generic introductions and conclusions.
Write concise paragraphs.
Naturally include collectible apparel, jerseys, hoodies, T-shirts or fan merchandise only when they genuinely fit the topic.
Do not aggressively promote products.
Create a click-worthy SEO title.
Write an engaging meta description (120-155 characters).
Generate 3-5 relevant SEO tags.
Avoid duplicate wording throughout the article.
`;

export function insertImages(content: string, images: string[], name: string) {
  if (!images.length) return content;
  const paragraphs = Array.from(content.matchAll(/<\/p>/gi));
  if (!paragraphs.length) return content;
  const insertMap = new Map<number, string>();
  images.forEach((image, index) => {
    const pos = Math.floor(
      ((index + 1) * paragraphs.length) / (images.length + 1)
    );
    insertMap.set(
      pos,
      `<img src="${image}" alt="${name}" loading="lazy" />`
    );
  });
  let result = "";
  let last = 0;
  paragraphs.forEach((match, i) => {
    const end = match.index! + match[0].length;
    result += content.slice(last, end);
    if (insertMap.has(i)) {
      result += insertMap.get(i);
    }
    last = end;
  });
  result += content.slice(last);
  return result;
}