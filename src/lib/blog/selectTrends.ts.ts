import gemini from "@/services/ai/gemini";
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
    now - trendsCachedAt < 5 * 60 * 1000
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
You are an SEO strategist selecting Google Trends topics for an informational
content website focused on entertainment, sports, fandom and pop culture.

Select the best ${max} topics from the CURRENT GOOGLE TRENDS list.

CURRENT TRENDS:
${trends.map((t) => `- ${t.keyword} (${t.traffic})`).join("\n")}

PRIMARY GOAL:
Do NOT simply select the topics with the highest current traffic.

Select topics that have BOTH:
1. Current search momentum
2. Strong probability of continued search demand after the current news cycle

The ideal topic is something people are becoming interested in NOW and are
likely to search again over the next several days, weeks or months.

Think:
"Will this still be worth publishing if someone reads the article 30, 60,
or 90 days from now?"

PRIORITY:
- Future search potential / search lifespan: 30%
- Upcoming events and anticipated releases: 25%
- Entertainment, sports, fandom & pop culture relevance: 20%
- Current popularity & momentum: 15%
- SEO opportunity / lower competition: 10%

HIGH-VALUE TOPICS:

1. UPCOMING EVENTS
- major championships
- tournaments
- award ceremonies
- concerts
- tours
- festivals
- major cultural events
- major sporting events
- scheduled announcements

2. UPCOMING RELEASES
- movies coming soon
- TV shows
- anime
- manga
- games
- albums
- music releases
- major franchise releases

3. PEOPLE / CELEBRITIES
- major actors
- musicians
- athletes
- celebrities
- directors
- creators
- people associated with major upcoming projects

4. FANDOM / FRANCHISES
- Marvel
- DC
- Star Wars
- anime franchises
- video game franchises
- major TV/movie franchises
- fictional characters
- major fandom discussions

5. SPORTS WITH LONGER SEARCH LIFESPAN
Prefer:
- upcoming championships
- playoffs
- major tournaments
- major sporting events
- tournament previews
- teams/athletes connected to upcoming major events

Avoid individual game results unless the game itself is a major historical
or cultural event.

REJECT SHORT-LIVED TOPICS:

- scores
- live scores
- final scores
- match results
- game results
- today's games
- tonight's games
- yesterday's games
- live updates
- play-by-play
- box scores
- standings caused by a single game
- injury updates with no broader story
- generic breaking news
- temporary viral incidents

IMPORTANT:

A topic having very high Google Trends traffic does NOT automatically make
it a good choice.

For example:

"Manchester United vs Arsenal tonight"
→ REJECT

"Manchester United"
→ ACCEPT if there is sustained interest or a major upcoming event.

"NFL scores"
→ REJECT

"Super Bowl 2027"
→ ACCEPT

"NBA scores"
→ REJECT

"NBA Finals 2027"
→ ACCEPT

"Taylor Swift concert tonight"
→ REJECT

"Taylor Swift upcoming tour"
→ ACCEPT

"movie X box office today"
→ REJECT

"movie X release date"
→ ACCEPT

"movie X"
→ ACCEPT if it has strong upcoming/future search potential.

"anime episode 12"
→ REJECT if the episode has already aired and the interest will disappear
quickly.

"anime X season 2"
→ ACCEPT if there is meaningful anticipation or ongoing fandom interest.

FUTURE SEARCH TEST:

Before selecting a topic, ask:

1. Will people still search for this in 7 days?
2. Will people still search for this in 30 days?
3. Is there a future event, release, announcement or cultural reason that
   will generate additional searches?
4. Can this topic support an informational article rather than just reporting
   today's news?
5. Does the topic have value beyond today's trend spike?

Prefer topics where the answer to most of these questions is YES.

EVERGREEN + TRENDING BALANCE:

Do NOT select only evergreen topics with no current momentum.

Do NOT select only breaking news.

Find the middle ground:

CURRENT INTEREST
+
FUTURE SEARCH DEMAND
+
INFORMATIONAL SEARCH INTENT

Examples of good article angles:

- release dates
- what to know before a movie releases
- cast and characters
- upcoming events
- schedules
- event guides
- background/explainers
- franchise guides
- athlete/celebrity profiles
- predictions before major events
- what to expect
- upcoming tours
- upcoming albums
- upcoming seasons
- major announcements with continuing relevance

MERCHANDISE FILTER:

The website may sell apparel, but NEVER select a topic because it can sell
merchandise.

REJECT:
- shirts
- jerseys
- hoodies
- sneakers
- shoes
- clothing
- apparel
- outfits
- merchandise
- shopping
- product reviews
- product recommendations

For example:

"baseball jerseys"
→ REJECT

"MLB All-Star Game"
→ ACCEPT

"football shirts"
→ REJECT

"Manchester United"
→ ACCEPT

"anime shirts"
→ REJECT

"One Piece"
→ ACCEPT

ALSO REJECT:

- politics
- finance
- jobs
- weather
- crime
- lawsuits
- accidents
- local incidents
- unrelated business news

IMPORTANT SELECTION RULE:

Do not select multiple keywords about the same short-lived event.

Diversify the final selection across:
- movies
- TV
- music
- celebrities
- sports
- anime/manga
- gaming
- major events
- fandom

Return ONLY valid JSON.

Format:
[
  {
    "keyword": "",
    "reason": ""
  }
]
`;

  const content = await gemini(prompt);
  return extractJson<SelectedTrend[]>(content);
}