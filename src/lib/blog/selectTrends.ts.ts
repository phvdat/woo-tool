import { askAI } from "../ai/client";
import { extractJson } from "../ai/extractJson";
import { SelectedTrend, Trend } from "./types";

export async function selectTrends(
    trends: Trend[],
    keywords: string[],
    max = 10
): Promise<SelectedTrend[]> {
    const prompt = `
You are an SEO strategist for a print-on-demand apparel business.

Website topics:

${keywords.map((k) => `- ${k}`).join("\n")}

Today's Google Trends:

${trends.map((t) => `- ${t.keyword} (${t.traffic})`).join("\n")}

Select the ${max} best trends that are highly relevant to this website.

Ignore:
- weather
- finance
- jobs
- crime
- local news
- lawsuits
- generic searches
- anything unrelated to the website topics

Return ONLY valid JSON.

[
  {
    "keyword": "",
    "reason": ""
  }
]
`;

    const content = await askAI(prompt);

    return extractJson<SelectedTrend[]>(content);
}