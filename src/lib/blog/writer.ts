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

Target keyword:
{{keyword}}

Why this topic is trending:
{{reason}}

Recent news context:
{{news}}

Additional instructions:
{{customPrompt}}

Requirements:

- Write one original informational article of 800-1000 words.
- The primary goal is to attract organic search traffic by providing useful information about a currently trending topic.
- The article must be informational, editorial, and useful to readers.
- The article is NOT an advertisement for the website.
- Do not promote the website, products, merchandise, clothing, apparel, or services.
- Do not include sales language or calls to action.
- Do not tell readers to shop, buy, check out, visit a store, or view products.
- Do not mention merchandise, jerseys, hoodies, T-shirts, apparel, or products unless they are genuinely necessary to explain the topic itself.
- Do not artificially connect the topic to fashion, clothing, or products.

- Base the article primarily on the recent news context above when available.
- Summarize and explain the news in your own words.
- Never copy wording from the news sources.
- If the news is incomplete or uncertain, clearly keep the explanation general instead of inventing details.
- If no recent news is available, write an evergreen informational article about the keyword.
- Explain why the topic is currently receiving attention.
- Add useful background so readers unfamiliar with the topic can understand it.
- Focus on facts, context, developments, and why people are interested in the topic.
- Keep the article valuable even after the current news cycle ends.

Formatting:

- Return HTML only inside the content field.
- Allowed tags:
  <p>
  <h2>
  <h3>
  <ul>
  <li>
  <strong>
  <em>
  <a>
- Write a compelling introduction.
- Include exactly 4-6 H2 sections.
- Use at most 2 H3 sections.
- Include at most one unordered list.
- Do not generate tables.
- Include exactly 3 FAQ questions.
- Finish with a conclusion under 80 words.

Writing style:

- Write naturally for a US audience.
- Keep paragraphs 2-4 sentences.
- Avoid repeating ideas.
- Mention the target keyword naturally.
- Write naturally for humans first, SEO second.
- Do not use clickbait.
- Do not use Markdown.
- Do not mention AI.
- Do not fabricate facts, scores, statistics, quotes, dates, people, or events.
- Do not present speculation as fact.
- Do not exaggerate the importance of the topic.
- Do not use promotional language.

Return ONLY valid JSON.

{
  "title": "",
  "metaDescription": "",
  "tags": [],
  "content": ""
}
`;

const defaultPrompt = `Write in a clear, friendly and informative style.
Create a compelling SEO title that accurately reflects the topic.
Write a meta description between 120 and 155 characters.
Generate 3-5 relevant SEO tags.
Focus on useful, factual information instead of filler.
Avoid generic introductions and conclusions.
Explain why the topic is currently trending.
Provide enough background for readers who are unfamiliar with the topic.
Keep the article useful even after the current trend fades.
Avoid repeating the same information or phrasing.
Do not promote products, stores, brands, or services.
Do not mention merchandise, jerseys, hoodies, T-shirts, apparel, shopping,
or purchasing unless the topic itself specifically requires it.
Do not include sales language, promotional language, or calls to action.`;

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