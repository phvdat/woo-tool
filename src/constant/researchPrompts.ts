export const EXTRACT_ENTITIES_PROMPT = `
You identify the real-world subject of an eCommerce product from its title alone.

Product title: {{productName}}
Category: {{category}}
Store: {{website}}

TASK:
Decide what the title is actually about, and whether it is worth searching the web for.

CLASSIFY THE TOPIC (trendTypeHint) — exactly one:
- sports_event: a competition, season, tournament, playoff, race, match, or result
- music_release: an album, single, EP, or award
- tour: a concert tour, residency, or festival run
- film_tv: a film, series, season of a show, or streaming release
- celebrity: a person known primarily for public life rather than a specific work
- viral_moment: a meme, incident, or moment that circulated publicly
- franchise: an established fictional or brand universe without a specific current event
- brand: a company or product line
- generic: no identifiable real-world subject

IDENTIFY ENTITIES:
- List only people, teams, organizations, works, tours, or brands that a reader could
  actually search for by name.
- Give each a short lowercase type such as "athlete", "team", "coach", "artist",
  "album", "tour", "studio", "league", "brand".
- Exclude apparel words (shirt, hoodie, jersey, sweatshirt, tee), color words, size
  words, marketing words (custom, personalized, hot, sale, best, vintage), and
  generic qualifiers.

searchWorthy:
- true only when at least one entity remains after exclusions, or when the title states
  a specific event, season, or date that could be verified.
- false for generic products, blank apparel, name/number customization, and anything
  whose only content is product type and colour.

UNCERTAINTY RULES (most important):
- Do NOT assume any relationship between two entities. Being named in the same title
  does not mean they are teammates, rivals, collaborators, or friends.
- Do NOT invent an event, date, quote, statistic, relationship, or trend.
- If the phrase formed by the entities is ambiguous or unfamiliar, say so in
  "uncertainties" and list the specific connection in "ambiguousRelationships".
- If you are unsure whether an entity is right, leave it out of "entities" and record
  the doubt in "uncertainties".
- An empty "entities" array with searchWorthy false is a perfectly good answer.

OUTPUT:
Return ONLY a JSON object, no markdown fence, no commentary.

{
  "entities": [{ "name": "...", "type": "..." }],
  "topic": "2-6 words naming the subject",
  "year": "YYYY or null",
  "possibleEvent": "the specific event/season/work the title appears to reference, or null",
  "uncertainties": ["..."],
  "ambiguousRelationships": ["..."],
  "searchWorthy": true,
  "trendTypeHint": "sports_event"
}
`;

export const RESEARCH_CONTEXT_PROMPT = `
You are researching the subject of an eCommerce product so a copywriter can write an
accurate product description later.

Product title: {{productName}}
Category: {{category}}
Entities identified: {{entities}}
Possible event or topic: {{possibleEvent}}
Year or season: {{year}}

Run web searches for these queries:
{{queries}}

Rules:
- Prefer primary and authoritative sources over aggregators.
- Prefer recent sources when the topic is a current event.
- If sources disagree with each other, say so explicitly. Never pick a winner.
- If you cannot establish what the phrase in the title refers to, say so plainly.
  A clear "this could not be verified" is a useful and acceptable answer.

OUTPUT:
Return ONLY a JSON object, no markdown fence, no commentary.

{
  "summary": "3-6 sentences of what the sources actually establish, citing nothing",
  "event": "the specific event, season, release, or moment confirmed by sources, or null",
  "season": "the year, season, or edition confirmed by sources, or null",
  "breaking": true or false,
  "trendType": "sports_event",
  "entitiesConfirmed": ["names of entities the sources actually confirm"],
  "context": "2-3 sentences of concrete context a fan would care about",
  "significance": "1-2 sentences on why this matters to the people who care about it",
  "canBeEstablished": true,
  "reasonIfNot": "why the reference could not be established, or null"
}
`;

export const EXTRACT_CLAIMS_PROMPT = `
Extract claims from the research notes below. Every claim must be traceable to a
numbered source.

Research summary:
{{summary}}

Confirmed event: {{event}}
Confirmed season: {{season}}
Entities confirmed by sources: {{entitiesConfirmed}}

Numbered sources:
{{sources}}

CLAIM TYPES — every claim must carry one:
- fact: a directly verifiable factual statement. Example: "Cleveland Guardians clinched a
  2026 postseason berth." Only use for things a source states outright.
- interpretation: a contextual reading derived from the facts. Example: "The postseason
  qualification became a notable moment for Guardians fans." Never phrase these as events
  that happened.
- social_signal: a trend or discussion signal noticed on social/community sources.
  Example: "The phrase has been circulating among fans on social media." Attribute these to
  social discussion, never present them as verified fact.

RULES:
- Be specific. Reject vague claims such as "X is very popular" or "X has a passionate fanbase".
- State the claim as a statement, in one sentence.
- "sources" must list the numbers of the sources that support it, and nothing else.
- Do not add facts that are not in the research summary or the sources.
- Prefer 4 to 8 claims. Do not exceed {{maxClaims}}.
- "importance" is "high" only for claims a customer would consider essential context.

OUTPUT:
Return ONLY a JSON object, no markdown fence, no commentary.

{
  "claims": [
    {
      "claim": "...",
      "claimType": "fact",
      "importance": "high",
      "sources": [1, 2]
    }
  ]
}
`;

export const VERIFY_CLAIMS_PROMPT = `
You are fact-checking claims against the sources that were collected for them. Sources
have already been checked for independence; your job is to judge whether they actually
say what the claim says, and whether they contradict each other.

Claims:
{{claims}}

Numbered sources:
{{sources}}

For each claim, decide one status:
- verified: the sources clearly support it and do not contradict each other
- unverified: the sources are about the right subject but do not clearly state it
- disputed: the sources contradict each other, or a source contradicts the claim

Never resolve a contradiction. If two reliable sources disagree, the claim is disputed.

OUTPUT:
Return ONLY a JSON object, no markdown fence, no commentary.

{
  "results": [
    { "id": "c1", "status": "verified", "note": "one short clause, or empty string" }
  ]
}
`;

export const BUILD_STORY_BRIEF_PROMPT = `
Assemble the verified research into a product story brief. This brief is the only context
a copywriter will be given, so anything you cannot support must be left out of it.

Product title: {{productName}}
Topic: {{topic}}
Event: {{event}}
Season: {{season}}
Confirmed entities: {{entities}}

Verified facts (independently confirmed):
{{verifiedFacts}}

Other claims, with their status:
{{otherClaims}}

Available sources:
{{sources}}

RULES:
- "verifiedFacts" entries must be facts. Never place an interpretation or a social signal
  there. If a claim was disputed, exclude it.
- "context" and "significance" must be derivable from the verified facts. Do not add dates,
  quotes, statistics, records, licensing, or relationships that are not present above.
- "fanAngle" is one sentence about why this context matters to the audience, written from
  the verified facts only.
- "searchIntent" lists 2-4 things a shopper would plausibly be trying to learn.
- "confidence" is your own honest read of how solid this brief is. It is stored as metadata
  only and never overrides the deterministic evidence score.

OUTPUT:
Return ONLY a JSON object, no markdown fence, no commentary.

{
  "topic": "2-6 words",
  "trendType": "sports_event",
  "event": "or null",
  "season": "or null",
  "breaking": false,
  "context": "2-3 sentences",
  "significance": "1-2 sentences",
  "fanAngle": "1 sentence",
  "entities": ["..."],
  "verifiedFacts": ["..."],
  "searchIntent": ["..."],
  "contentAngle": "1-2 sentences on how to write about this honestly",
  "confidence": 0.9
}
`;

export const DESCRIPTION_RESEARCH_HEADER = `
=== VERIFIED PRODUCT RESEARCH ===
The block below comes from web research on the real subject of this product. It was
checked against independent sources before being written here.

{{researchBlock}}

=== HOW TO USE IT ===
- Treat only the VERIFIED FACTS as established. Anything marked disputed or uncertain was
  NOT confirmed — do not state it.
- Never state an interpretation or a social signal as an objective fact.
- Never mention that research was done. Never mention sources, citations, this block,
  confidence, or scores. The reader only sees the product description.
- If a fact cannot be verified, leave it out. A shorter accurate description beats a
  longer invented one.

=== WHAT YOU MUST NOT INVENT ===
Do not state any of the following unless it appears in the PRODUCT DATA below or in the
verified facts: fabric composition, weight, fit or cut, print or embroidery method, sizing,
shipping or delivery terms, return policy, official licensing or affiliation, an event
date, a price, a quotation, or a personal relationship between two named people.

=== FILLER TO AVOID ===
Do not reach for these as automatic filler: "perfect for fans", "show your love", "show
your support", "great for everyday wear", "high-quality material", "stylish and
comfortable", "perfect gift for", "whether you're", "this shirt is more than just". Use a
phrase from this list only when it genuinely carries information. Do not repeat the
product title unnaturally and do not repeat the same exact phrase for keyword purposes.
=== END VERIFIED PRODUCT RESEARCH ===
`;

export const RESEARCH_UNAVAILABLE_HEADER = `
=== PRODUCT RESEARCH UNAVAILABLE ===
No verified background could be established for the subject of this product. Write a
conservative, product-focused description using only the product data below. Do not guess
at what the title references, and do not invent a story, an event, a person, a date, or a
relationship. If the title is ambiguous, ignore the ambiguity entirely rather than
guessing at it.
Do not mention research, sources, or verification in any form.
=== END PRODUCT RESEARCH UNAVAILABLE ===
`;

export const FALLBACK_DESCRIPTION_PROMPT = `
Write a short, plain eCommerce product description from the product data below only.

Product title: {{productName}}
Category: {{category}}
Store: {{website}}

Rules:
- 60-90 words, plain text, 2 short paragraphs.
- Describe the product and its design in neutral terms.
- Do not guess what the title references. Do not name any person, team, event, season,
  quote, or relationship.
- No hype, no keyword repetition, no invented specifications.
- Output only the description.
`;
