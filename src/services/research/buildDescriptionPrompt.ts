import {
  DESCRIPTION_RESEARCH_HEADER,
  RESEARCH_UNAVAILABLE_HEADER,
} from "@/constant/researchPrompts";
import { DEFAULT_PROMPT_DESCRIPTION } from "@/constant/commons";
import { ResearchClaim, ResearchTopic } from "@/types/research";
import { WooCommerce } from "@/types/woo";

function categoryOf(product: WooCommerce): string {
  const raw = product.Categories || "";
  return raw.split(">").pop()?.trim() || "";
}

function section(label: string, lines: string[]): string {
  if (!lines.length) {
    return "";
  }
  return `${label}:\n${lines.map((line) => `- ${line}`).join("\n")}`;
}

/**
 * `verified_only` is the important one: the brief exists but some of it rests on
 * a single source or an unresolved ambiguity, so the writer is told to use the
 * facts and leave everything else alone. `fallback` and `insufficient` both
 * resolve to the no-research header, which tells the writer not to guess.
 */
export function shouldUseResearch(topic?: ResearchTopic): boolean {
  if (!topic || topic.status !== "completed") {
    return false;
  }
  return topic.quality.band === "full" || topic.quality.band === "verified_only";
}

function verifiedBlock(topic: ResearchTopic): string {
  const brief = topic.storyBrief!;

  const claimsByType = (claimType: ResearchClaim["claimType"]) =>
    topic.claims.filter((claim) => claim.claimType === claimType);

  const facts = brief.verifiedFacts.length
    ? brief.verifiedFacts
    : claimsByType("fact")
        .filter((claim) => claim.status === "verified")
        .map((claim) => claim.claim);

  const disputed = topic.claims.filter((claim) => claim.status === "disputed");
  const interpretations = claimsByType("interpretation");
  const signals = claimsByType("social_signal");

  const parts = [
    section("PRODUCT", [
      `Subject: ${brief.topic}`,
      brief.event ? `Event or work: ${brief.event}` : "",
      brief.season ? `Season or year: ${brief.season}` : "",
    ]),
    section("VERIFIED FACTS", facts),
    section("BACKGROUND", [brief.context, brief.significance, brief.fanAngle].filter(Boolean)),
    section(
      "INTERPRETATIONS (use conservatively, only if clearly supported, never as hard fact)",
      interpretations.map((claim) => claim.claim),
    ),
    section(
      "SOCIAL SIGNALS (may only be mentioned as online discussion, never as verified fact)",
      signals.map((claim) => claim.claim),
    ),
    section(
      "DO NOT USE - conflicting or unconfirmed",
      disputed.map((claim) => `${claim.claim}${claim.note ? ` (${claim.note})` : ""}`),
    ),
    section("AUDIENCE ANGLE", [brief.contentAngle].filter(Boolean)),
  ].filter(Boolean);

  return parts.join("\n\n");
}

/**
 * Research reaches the writer two ways, both safe for existing store prompts:
 * a `{product-story}` placeholder for stores that opt in, and an unconditional
 * prepended header for stores whose saved prompt has no placeholder at all.
 *
 * Three distinct paths, and the difference matters:
 * - research disabled (no topic at all) → the prompt is passed through untouched,
 *   so turning the feature off is byte-identical to today;
 * - research enabled but unusable → a short header telling the writer not to guess;
 * - generic product → also no header, because nothing was ever searched for it.
 */
export function buildDescriptionPrompt({
  storePrompt,
  product,
  website,
  topic,
}: {
  storePrompt: string;
  product: WooCommerce;
  website: string;
  topic?: ResearchTopic;
}): string {
  const category = categoryOf(product);
  const useResearch = shouldUseResearch(topic);

  const storyText = useResearch ? verifiedBlock(topic!) : "";

  // A blank store prompt would leave the writer with only the research header.
  // The default is substituted only on the researched path so an existing store
  // with no prompt keeps behaving exactly as it does today.
  const effectivePrompt =
    useResearch && !storePrompt.trim() ? DEFAULT_PROMPT_DESCRIPTION : storePrompt;

  const withPlaceholder = effectivePrompt
    .replaceAll("{product-name}", product.Name)
    .replaceAll("{category}", category)
    .replaceAll("{website}", website)
    .replaceAll(
      "{product-story}",
      storyText ||
        (topic ? "(no verified research was found for this product)" : ""),
    );

  if (!topic) {
    return withPlaceholder;
  }

  if (useResearch) {
    const header = DESCRIPTION_RESEARCH_HEADER.replaceAll("{{researchBlock}}", storyText);
    return `${header}\n\n${withPlaceholder}`;
  }

  if (topic.searchWorthy === false) {
    // Nothing was searched, so there is nothing to warn about.
    return withPlaceholder;
  }

  return `${RESEARCH_UNAVAILABLE_HEADER}\n\n${withPlaceholder}`;
}

export function buildFallbackPrompt({
  product,
  website,
}: {
  product: WooCommerce;
  website: string;
}): string {
  const category = categoryOf(product);
  return [
    `Product title: ${product.Name}`,
    `Category: ${category}`,
    `Store: ${website}`,
  ].join("\n");
}
