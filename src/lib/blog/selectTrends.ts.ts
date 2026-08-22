import { askAI } from "../ai/client";
import { extractJson } from "../ai/extractJson";
import { filterTrends } from "./filterTrends";
import { getGoogleTrends } from "./getTrends";
import { SelectedTrend, Trend } from "./types";

let cachedTrends: Trend[] = [];
let trendsCachedAt = 0;

export async function getCachedTrends() {
  const now = Date.now();
  if (
    cachedTrends &&
    now - trendsCachedAt < 6 * 60 * 60 * 1000
  ) {
    return cachedTrends;
  }
  cachedTrends = filterTrends(
    await getGoogleTrends()
  );
  trendsCachedAt = now;
  return cachedTrends;
}

export async function selectTrends(
  trends: Trend[],
  max = 10
): Promise<SelectedTrend[]> {
  const prompt = `
Select the best ${max} Google Trends topics for an informational SEO blog.
CURRENT TRENDS:
${trends.map((t) => `- ${t.keyword} (${t.traffic})`).join("\n")}
GOAL:
Choose topics with the highest potential for organic traffic, prioritizing
what is trending RIGHT NOW.
PRIORITY:
- Current popularity & momentum: 50%
- Entertainment, sports, fandom & pop culture: 25%
- SEO opportunity / lower competition: 15%
- Long-term search interest: 10%
ACCEPT:
Sports, athletes, major events, championships, musicians, concerts, tours,
anime, manga, games, esports, movies, TV shows, celebrities, fictional
characters, fandom, major releases, announcements and cultural events.
REJECT:
Fashion, clothing, apparel, streetwear, sportswear, jerseys, sneakers,
shoes, accessories, outfits, shopping, products, merchandise and product
reviews/recommendations.

Also reject politics, finance, jobs, weather, crime, lawsuits, accidents,
local incidents, generic breaking news and unrelated business news.
IMPORTANT:
Choose the actual trending topic, never a product related to it.
"baseball jerseys" → REJECT
"MLB All-Star Game" → ACCEPT
"football shirts" → REJECT
"Manchester United" → ACCEPT
"anime shirts" → REJECT
"One Piece" → ACCEPT

Never select a topic because it can sell merchandise.

Return ONLY valid JSON:
[
  {"keyword": "", "reason": ""}
]
`;
  const content = await askAI(prompt);
  return extractJson<SelectedTrend[]>(content);
}