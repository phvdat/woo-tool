import { WebsiteConfig } from "@/types/woo";
import { askAI } from "../ai/client";
import { extractJson } from "../ai/extractJson";
import type { BlogArticle, SelectedTrend } from "../blog/types";
import { NewsContext } from "./getNewsContext";

export async function writeBlog(
  trend: SelectedTrend,
  news: NewsContext[],
  website: WebsiteConfig
): Promise<BlogArticle> {
  const newsText =
    news.length > 0
      ? news
        .map(
          (item, index) => `
${index + 1}.
Title: ${item.title}
Published: ${item.pubDate}
Summary: ${item.description}
Link: ${item.link}
`
        )
        .join("\n")
      : "No recent news available.";

  const prompt = template
    .replaceAll("{{shopName}}", website.shopName)
    .replaceAll("{{keyword}}", trend.keyword)
    .replaceAll("{{reason}}", trend.reason)
    .replaceAll("{{news}}", newsText)
    .replaceAll(
      "{{customPrompt}}",
      website.autoBlog.prompt || defaultPrompt
    );

  const content = await askAI(prompt);

  return extractJson<BlogArticle>(content);
}

const template = `
You are a professional SEO content writer writing for readers in the United States.
Website:
{{shopName}}
Target keyword:
{{keyword}}
Why this topic is trending:
{{reason}}
Recent news context:
{{news}}
Additional instructions:
{{customPrompt}}
Requirements:
- Write one original article of 800-1000 words.
- Base the article primarily on the recent news context above when available.
- Summarize and explain the news in your own words. Never copy wording from the news.
- If the news is incomplete or uncertain, clearly keep the explanation general instead of inventing details.
- If no recent news is available, write an evergreen article about the keyword.
- Explain why the topic is currently receiving attention.
- Add useful background so readers unfamiliar with the topic can understand it.
- Keep the article valuable even after the news cycle ends.
Formatting:
- Return HTML only inside the content field.
- Allowed tags:
  <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>
- Write a compelling introduction.
- Include exactly 4-6 H2 sections.
- Use at most 2 H3 sections.
- Include at most one unordered list.
- Do not generate tables.
- Include exactly 3 FAQ questions.
- Finish with a conclusion under 80 words.
Writing style:
- Keep paragraphs 2-4 sentences.
- Avoid repeating ideas.
- Mention the target keyword naturally.
- Write naturally for humans first, SEO second.
- Do not use clickbait.
- Do not use Markdown.
- Do not mention AI.
- Do not fabricate facts, scores, statistics, quotes, dates or events.
Return ONLY valid JSON.
{
  "title":"",
  "metaDescription":"",
  "tags":[],
  "content":""
}
`;

const defaultPrompt = `
Write in a clear, friendly and informative style.
Create a click-worthy SEO title.
Write a meta description between 120 and 155 characters.
Generate 3-5 SEO tags.
Focus on useful information instead of filler.
Avoid generic introductions and conclusions.
When appropriate, naturally mention fan merchandise, jerseys, hoodies, T-shirts or collectible apparel.
Never force product promotion.
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