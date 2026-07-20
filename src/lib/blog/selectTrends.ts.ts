import { askAI } from "../ai/client";
import { extractJson } from "../ai/extractJson";
import { SelectedTrend, Trend } from "./types";

export async function selectTrends(
    trends: Trend[],
    keywords: string[],
    max = 10
): Promise<SelectedTrend[]> {
    const prompt = `
You are an SEO strategist for a print-on-demand apparel website.

Website topics:

${keywords.map((k) => `- ${k}`).join("\n")}

Today's Google Trends:

${trends.map((t) => `- ${t.keyword} (${t.traffic})`).join("\n")}

Your goal is NOT to select the biggest trends.

Instead, identify SEO opportunities that are easier to rank and have strong merchandise potential.

Selection priority:

- Low SEO competition (40%)
- Merchandise buying intent (30%)
- Evergreen potential (20%)
- Current popularity (10%)

Popularity should NEVER outweigh lower SEO competition.

If two trends have similar popularity, always prefer the one with:
- lower SEO competition
- stronger merchandise potential
- longer-lasting interest

Prefer:
- sports teams
- athletes
- musicians
- bands
- concerts
- tours
- anime
- manga
- games
- esports
- movies
- TV series
- comic characters
- fandoms
- seasonal events
- entertainment

Ignore:
- weather
- finance
- politics
- jobs
- crime
- lawsuits
- accidents
- local news
- generic viral searches
- topics unrelated to the website

Select ONLY the best ${max} trends.

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