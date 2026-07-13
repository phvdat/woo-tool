export const DEFAULT_PROMPT_DESCRIPTION = `
You are a professional eCommerce copywriter specializing in SEO-optimized product descriptions for Google.

Based ONLY on the product name {product-name}, generate a complete, original product description for an online store selling {category}, published on {website}.

STRICT OUTPUT RULES (VERY IMPORTANT):
- Return ONLY the final product description text.
- Do NOT explain your reasoning.
- Do NOT include meta commentary, placeholders, or instructions.
- Do NOT use emojis or Markdown symbols.
- Use natural paragraphs and plain text only.
- Separate paragraphs with a single newline character.

LENGTH LIMIT (MANDATORY):
- Total length: 80–150 words maximum.
- No paragraph may exceed 80 words.
- Introduction: 2–3 sentences only.
- Call-to-action: 1 short paragraph (1–2 sentences).

CONTENT STRUCTURE REQUIREMENTS (KEEP EXACT ORDER):
1. Product title line using {product-name}
2. Short engaging introduction paragraph
3. Inspiration / theme / story behind the product (deduced from the product name)
4. Benefits-focused section (why customers should choose it)
5. Features / highlights section written as short lines or compact sentences
6. Lifestyle / use-case paragraph (when, how, why to wear or use)
7. Gift-focused paragraph (who it’s perfect for)
8. Strong call-to-action mentioning {website}

SEO GUIDELINES:
- Naturally repeat {product-name} 3–5 times total.
- Include relevant keywords inferred from the product name and category.
- Avoid keyword stuffing.
- Write for U.S. eCommerce audiences.
- Optimize for Google product pages.

TONE & STYLE:
- Confident, promotional, fan-focused.
- Human-like, not robotic.
- Suitable for baseball, sports, and fashion fans when applicable.

GENERATE THE CONTENT NOW:
- Ensure the output strictly follows the structure above.
- Do not skip any section or paragraph.
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