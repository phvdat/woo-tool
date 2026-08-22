import { askAI } from "../ai/client";
import { extractJson } from "../ai/extractJson";
import type { BlogArticle, SelectedTrend } from "../blog/types";
import { NewsContext } from "./getNewsContext";

export async function writeBlog(
  trend: SelectedTrend,
  news: NewsContext[],
): Promise<BlogArticle> {
  const newsText =
    news.length > 0
      ? news
        .map(
          (item, index) => `
${index + 1}. ${item.title}
Published: ${item.pubDate}
Summary: ${item.description}
Source: ${item.link}`,
        )
        .join("\n")
      : "No recent news available.";

  const prompt = `
You are a professional SEO content writer for a US audience.
TOPIC:
${trend.keyword}
TREND REASON:
${trend.reason}
RECENT NEWS:
${newsText}

TASK:
Write one original, factual, informational article about the trending topic.

GOALS:
- Maximize useful organic search traffic.
- Explain why the topic is trending now.
- Give enough background for readers unfamiliar with it.
- Focus on facts, context, recent developments, and lasting value.
- Base current claims primarily on the provided news.
- If news is unavailable, write an evergreen article about the topic.
- Never invent or present uncertain information as fact.

CONTENT:
- Write 500-700 words.
- Prioritize useful, relevant information over word count.
- Explain why the topic is trending and provide enough background for unfamiliar readers.
- Base current claims primarily on the provided news.
- If news is unavailable, write an evergreen article about the topic.
- Do not invent facts, statistics, quotes, dates, people, scores, or events.
- Do not copy wording from sources.
- Avoid repetition, filler, speculation, clickbait, and exaggerated claims.
- Never promote products, stores, services, or merchandise.
- Do not artificially connect the topic to fashion, clothing, or products.

STRUCTURE:
- Choose the structure that best fits the topic and search intent.
- Use headings, lists, and FAQs only when genuinely useful.
- Do not force a fixed number of sections or FAQs.
- Keep the article natural, readable, and logically organized.
- End with a concise conclusion when appropriate.

HTML:
- Return HTML only in "content".
- Allowed tags: <p>, <h2>, <h3>, <ul>, <li>, <strong>, <em>, <a>.
- No Markdown.
- No tables.
- Do not include <html>, <head>, <body>, <script>, or CSS.

SEO:
- Create a compelling but accurate SEO title.
- Meta description: 120-155 characters.
- Generate 3-5 relevant SEO tags.

OUTPUT:
Return ONLY valid JSON. Do not include markdown fences or explanations.

{
  "title": "",
  "metaDescription": "",
  "tags": [],
  "content": ""
}
`;

  const content = await askAI(prompt);
  return extractJson<BlogArticle>(content);
}

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