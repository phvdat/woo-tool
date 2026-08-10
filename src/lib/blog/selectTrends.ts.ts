import { askAI } from "../ai/client";
import { extractJson } from "../ai/extractJson";
import { SelectedTrend, Trend } from "./types";

export async function selectTrends(
  trends: Trend[],
  keywords: string[],
  max = 10
): Promise<SelectedTrend[]> {
  const prompt = `
You are an SEO content strategist for a website that publishes
trend-driven blog content.

Website topics:

${keywords.map((k) => `- ${k}`).join("\n")}

Today's Google Trends:

${trends.map((t) => `- ${t.keyword} (${t.traffic})`).join("\n")}

GOAL:

Find the HOTTEST and most interesting topics that can attract
organic search traffic.

The selected topic does NOT need to be related to products,
fashion, clothing, or the website's store.

The blog exists primarily to capture search traffic from
CURRENT trending topics.

Do NOT think about merchandise, products, shirts, shoes,
jerseys, or selling intent when selecting trends.

SELECTION PRIORITY:

- Current popularity and search momentum (50%)
- Relevance to entertainment, sports, fandom, or pop culture (25%)
- SEO opportunity / lower competition (15%)
- Potential for sustained search interest (10%)

CURRENT POPULARITY IS VERY IMPORTANT.

Prefer topics that are actively trending RIGHT NOW.

GOOD TOPICS:

- sports teams
- major sports events
- athletes
- championships
- musicians
- singers
- bands
- concerts
- tours
- album releases
- anime
- manga
- games
- esports
- movies
- TV series
- streaming shows
- celebrities
- fictional characters
- comic characters
- major entertainment events
- major cultural events
- viral fandom topics
- major seasonal events
- major announcements
- major releases
- major competitions

The topic should be something people are currently searching for,
talking about, watching, following, or interested in.

STRICTLY REJECT:

- fashion
- fashion trends
- clothing trends
- apparel trends
- streetwear trends
- sportswear
- jersey trends
- baseball jersey trends
- football jersey trends
- sneaker trends
- shoe trends
- bag trends
- accessory trends
- outfit ideas
- what to wear
- clothing styles
- shopping trends
- product recommendations
- product reviews
- generic shopping queries
- generic merchandise topics
- generic clothing keywords
- generic product keywords

Examples of topics to REJECT:

- "2026 fashion trends"
- "best baseball jerseys"
- "football jersey trends"
- "summer outfits"
- "trending sneakers"
- "best hoodies"
- "streetwear trends"
- "sportswear trends"

Examples of topics to ACCEPT:

- "BLACKPINK comeback"
- "Taylor Swift"
- "NBA Finals"
- "World Cup 2026"
- "One Piece"
- "Stranger Things"
- "Minecraft"
- "Marvel"
- "Super Bowl"
- "a major athlete currently trending"
- "a major concert or tour currently trending"

IMPORTANT:

The keyword itself should represent the TRENDING TOPIC,
not a product associated with that topic.

For example:

"baseball jerseys" -> REJECT
"MLB All-Star Game" -> ACCEPT

"football shirts" -> REJECT
"Manchester United" -> ACCEPT

"sneaker trends" -> REJECT
"NBA Finals" -> ACCEPT

"anime shirts" -> REJECT
"One Piece" -> ACCEPT

"summer fashion" -> REJECT
"BLACKPINK comeback" -> ACCEPT

DO NOT artificially connect a topic to products or merchandise.

The selected topics will be used to create informational,
entertaining, and trend-focused blog articles.

Do NOT select a topic because it could sell merchandise.

Also avoid topics that are primarily:

- politics
- finance
- jobs
- weather
- crime
- lawsuits
- accidents
- local incidents
- generic breaking news
- unrelated business news

Prefer topics that are:

- highly searchable
- currently trending
- interesting to a broad audience
- fandom-driven
- entertainment-driven
- sports-driven
- culturally relevant
- suitable for an informational blog article

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