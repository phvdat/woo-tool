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
website focused on entertainment, movies, TV, anime, manga, books, novels,
video games, music, singers, celebrities, fandom and pop culture.

Select the best ${max} topics from the CURRENT GOOGLE TRENDS list.

CURRENT TRENDS:
${trends.map((t) => `- ${t.keyword} (${t.traffic})`).join("\n")}

GOAL:

Do NOT simply choose the highest-traffic keywords.

Choose topics with:

1. Current search momentum
2. Strong search potential for 30–90+ days
3. Informational search intent
4. A future event, release, project or fandom reason for continued interest
5. Reasonable SEO opportunity

PRIORITY:

* Long-term search lifespan: 35%
* Upcoming releases / future events: 25%
* Entertainment / fandom relevance: 20%
* Current momentum: 10%
* SEO opportunity: 10%

Think:

"Will people still search for this 30, 60 or 90 days from now?"

If the answer is mostly NO, reject the topic even if its current traffic is
very high.

HIGH-PRIORITY TOPICS:

1. MOVIES

* upcoming movies
* sequels
* remakes
* reboots
* release dates
* cast / characters
* movie adaptations
* major movie franchises

2. TV / STREAMING

* upcoming series
* upcoming seasons
* season 2 / season 3
* major streaming projects
* cast / characters
* adaptations
* release dates

3. ANIME / MANGA

* upcoming anime
* upcoming seasons
* upcoming movies
* new adaptations
* sequels
* major franchises
* established characters
* long-term fandom topics

4. BOOKS / NOVELS

* upcoming books
* upcoming novels
* sequels
* fantasy / sci-fi franchises
* major authors
* book-to-film adaptations
* book-to-TV adaptations
* established book series

5. VIDEO GAMES

* upcoming games
* major releases
* sequels
* franchise announcements
* game adaptations
* major gaming franchises

6. MUSIC / SINGERS / TOURS

* major singers
* upcoming albums
* upcoming releases
* upcoming tours
* world tours
* tour announcements
* tour schedules
* major concerts
* established artists
* major music projects

Prefer artist/tour topics with future activity over individual concerts.

Examples:
"Taylor Swift upcoming tour" → ACCEPT
"Taylor Swift concert tonight" → REJECT

7. CELEBRITIES
   Prefer celebrities connected to:

* upcoming movies
* upcoming TV shows
* upcoming albums
* upcoming tours
* major franchise projects

Avoid gossip and short-lived controversies.

8. FRANCHISES / FANDOM

Strongly value established franchises such as:

* Marvel
* DC
* Star Wars
* Harry Potter
* Lord of the Rings
* Disney
* major anime / manga franchises
* major game franchises
* major fantasy / sci-fi franchises

Prefer topics connected to future releases, sequels, adaptations or major
fandom interest.

SPORTS FILTER:

Sports are NOT a primary category.

Normally REJECT:

* scores
* live scores
* today's games
* tonight's games
* match results
* game results
* box scores
* standings
* individual game previews
* injuries
* trade rumors
* post-game reactions
* short-lived sports news

Sports are highly competitive and often dominated by major sports publishers.

Only consider a sports topic if it has unusually strong long-term
informational value and is likely to remain searched for months.

When a strong entertainment topic and a sports topic compete, prefer the
entertainment topic.

REJECT SHORT-LIVED TOPICS:

* breaking news with no lasting value
* today's / tonight's events
* individual episode news
* episode spoilers
* live updates
* play-by-play
* temporary viral incidents
* short-lived controversies
* one-day celebrity drama
* immediate reactions
* temporary rankings or results

Prefer:

* release dates
* upcoming projects
* upcoming seasons
* sequels
* adaptations
* cast
* characters
* guides
* franchise topics
* upcoming albums
* upcoming tours
* future events
* "what to know"
* "what to expect"

SEO COMPETITION:

Do not confuse high search volume with good SEO opportunity.

Be cautious with topics dominated by major publishers such as ESPN, BBC,
Reuters, AP, Variety, Deadline, major newspapers, league websites and
Wikipedia.

Prefer informational topics where an independent entertainment website can
provide useful focused content.

MERCHANDISE FILTER:

NEVER select a topic because it can sell products.

Reject:

* shirts
* jerseys
* hoodies
* shoes
* clothing
* apparel
* merchandise
* shopping
* product reviews
* product recommendations

Examples:
"anime shirts" → REJECT
"One Piece" → ACCEPT
"Marvel hoodie" → REJECT
"Marvel upcoming movie" → ACCEPT

DIVERSIFICATION:

Do not select multiple keywords about the same event or franchise unless they
represent clearly different long-term topics.

Prefer a mix of:

* movies
* TV
* anime / manga
* books / novels
* gaming
* music / singers / tours
* celebrities
* franchises / fandom

FINAL TEST:

Before selecting a topic, ask:

1. Will people still search for it in 30 days?
2. Could they still search for it in 60–90 days?
3. Is there a future release, event, project or fandom reason?
4. Can it support an informational article?
5. Is it more than a short-lived news spike?
6. Can an independent website realistically provide useful content?

Prefer topics where most answers are YES.

The goal is NOT today's traffic.

The goal is long-term organic search potential from current trending topics.

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