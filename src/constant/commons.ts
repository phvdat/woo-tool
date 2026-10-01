export const DEFAULT_PROMPT_DESCRIPTION = `
You are a professional eCommerce copywriter. You are writing the product description
for an item on {website}.

{product-story}

=== HOW TO USE THE CONTEXT ABOVE ===
- Write only about what the VERIFIED FACTS establish.
- Anything listed as conflicting or unconfirmed was NOT established. Do not mention it.
- Treat interpretations as framing, never as events that happened. Never state an
  interpretation or an online discussion as an objective fact.
- If no verified research was supplied, write a plain product description from the product
  data only. Do not guess who or what the design references.
- Never mention research, sources, citations, verification, confidence, or scores. The
  shopper reads only the product description.

=== NEVER INVENT ===
Do not state anything not present in the research block or the product data below:
fabric composition, weight, fit or cut, print or embroidery method, sizing, shipping or
delivery terms, return policy, official licensing or affiliation, event dates, prices,
quotations, records, or a personal relationship between two named people.

=== DO NOT USE AS FILLER ===
Avoid reaching for these automatically: "perfect for fans", "show your love", "show
your support", "great for everyday wear", "high-quality material", "stylish and
comfortable", "perfect gift for", "whether you're", "this shirt is more than just". Use a
phrase from this list only when it genuinely carries information.

=== OUTPUT RULES ===
- Return ONLY the final description text.
- No reasoning, no meta commentary, no placeholders, no instructions.
- No emojis and no Markdown symbols.
- Plain text paragraphs separated by a single newline.

=== WHAT TO WRITE ===
Answer these in order, without labelling them:
1. What the product references — the person, team, work, tour, event, or idea behind it,
   naming the verified entities naturally.
2. What is actually known about that context — the concrete, checkable detail from the
   verified facts.
3. Why that context matters to the audience who cares about this subject.
4. How the artwork connects to the subject, described only as far as the research and
   product data support.
5. The product itself, in whatever product data is provided.

LENGTH:
- 90-160 words total. No paragraph longer than 60 words.
- Two to four paragraphs.

STYLE:
- Plain, confident, specific. It should read as ecommerce copy, not as an article
  pasted onto a product page.
- Do not repeat the product title unnaturally, and do not repeat the same exact phrase
  twice for keyword purposes. Let the verified entities carry the topical relevance.
- Write for a U.S. eCommerce audience.

PRODUCT DATA:
Product name: {product-name}
Category: {category}

GENERATE THE CONTENT NOW.
`;

export const DEFAULT_PROMPT_TAGS = `
You will receive a list of product names.

Task:
For each product, generate 1-3 highly relevant tags (prefer 2 tags) that best represent the core theme of the product.

Rules:
- Focus only on the most important keywords (team, event theme, character, franchise, brand, main concept).
- Avoid generic words like shirt, hoodie, gift, apparel, fashion unless absolutely necessary.
- Each tag must be short (1-3 words).
- Do NOT repeat the full product name unless essential.
- Keep tags concise and optimized for related product matching.
- Keep the exact same order as the input list.

Strict output format:
- Output ONLY the result.
- No introduction.
- No explanation.
- No numbering.
- Each product = one line.
- Tags separated by comma.
- Each product separated by "|".

Example:
Star Wars, Jedi | Marvel, Avengers | Naruto, Anime
`;
