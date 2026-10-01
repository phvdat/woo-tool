import { WooCommerce } from "@/types/woo";
import { substantiveTokens } from "./topicKey";

export interface DescriptionValidation {
  ok: boolean;
  reasons: string[];
}

const MIN_WORDS = 40;
const MAX_TITLE_OVERLAP = 0.7;
const MIN_WORDS_WITH_RESEARCH = 55;

const URL_PATTERN = /https?:\/\/|\bwww\.[a-z0-9-]+\.[a-z]{2,}/i;

const META_LEAK_PATTERNS: [RegExp, string][] = [
  [/\baccording to (our|the) research\b/i, "mentions research"],
  [/\bper (our|the) research\b/i, "mentions research"],
  [/\bresearch (?:shows|found|indicates|confirmed)\b/i, "mentions research"],
  [/\b(?:topicKey|topic key|story brief|product story brief)\b/i, "exposes research metadata"],
  [/\bquality score\b/i, "exposes research metadata"],
  [/\bresearch (?:quality|score|status|confidence)\b/i, "exposes research metadata"],
  [/\bconfidence (?:score|of) \d/i, "exposes research metadata"],
  [/\b(?:verified|unverified) fact(?:s)?\b/i, "exposes research metadata"],
  [/\bclaim(?:s)? (?:type|status)\b/i, "exposes research metadata"],
  [/\bsources?:\s*https?/i, "exposes research metadata"],
];

const UNSUPPORTED_SPEC_PATTERNS: [RegExp, string][] = [
  [/\b\d{2,3}\s*%\s*(?:cotton|polyester|ring[- ]spun|cotton)\b/i, "fabric composition"],
  [/\b(?:cotton|polyester|ring[- ]spun)[/ ](?:\d{1,3}\s*%?|\d{1,3}\s*%)/i, "fabric composition"],
  [/\b(?:triple|double|single)[- ](?:needle|stitch)\b/i, "printing method"],
  [/\b(?:screen[- ]printed|dtg|embroidery|embroidered|sublimation)\b/i, "printing method"],
  [/\b(?:regular|relaxed|boxy|athletic|slim|true[- ]to[- ]size) fit\b/i, "fit"],
  [/\b(?:pre[- ]shrink|pre[- ]washed|ring[- ]spun|combed cotton)\b/i, "fabric specification"],
  [/\b(?:official|licensed|authorized) (?:licen[cs]e|product|merchandise)\b/i, "licensing claim"],
  [/\bofficial(?:ly)? (?:licensed|approved|endorsed)\b/i, "licensing claim"],
  [/\bfree (?:standard )?shipping\b/i, "shipping claim"],
  [/\bships? (?:in|within) \d+ (?:business )?days?\b/i, "shipping claim"],
  [/\b(?:machine wash|tumble dry|wash cold)\b/i, "care instruction"],
];

/** Only a subset of the claims a writer may make; each needs product evidence. */
const CONTEXTUAL_MARKERS = [
  "clinched",
  "postseason",
  "playoffs",
  "finals",
  "championship",
  "record",
  "signed",
  "drafted",
  "released",
  "announced",
  "toured",
  "performed",
];

function words(value: string): string[] {
  return value
    .replace(/<[^>]*>/g, " ")
    .split(/[^a-z0-9']+/i)
    .filter(Boolean);
}

function titleOverlap(description: string, title: string): number {
  const titleTokens = new Set(substantiveTokens(title));
  if (!titleTokens.size) {
    return 0;
  }
  const descriptionTokens = substantiveTokens(description);
  if (!descriptionTokens.length) {
    return 1;
  }
  const repeated = descriptionTokens.filter((token) => titleTokens.has(token)).length;
  return repeated / descriptionTokens.length;
}

/**
 * Cheap gate run before a description is written back to the product record.
 * It does not judge prose quality; it only catches the failure modes that
 * matter here: a restated title, leaked research internals, source URLs, and
 * fabricated specifications that no product data supports.
 */
export function validateDescription({
  description,
  product,
  hasResearch,
}: {
  description: string;
  product: WooCommerce;
  hasResearch: boolean;
}): DescriptionValidation {
  const reasons: string[] = [];

  const text = (description || "").trim();
  const plain = text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

  if (!plain) {
    return { ok: false, reasons: ["description is empty"] };
  }

  if (URL_PATTERN.test(plain)) {
    reasons.push("description contains a URL");
  }

  for (const [pattern, reason] of META_LEAK_PATTERNS) {
    if (pattern.test(plain)) {
      reasons.push(reason);
      break;
    }
  }

  const wordCount = words(plain).length;
  const minimum = hasResearch ? MIN_WORDS_WITH_RESEARCH : MIN_WORDS;
  if (wordCount < minimum) {
    reasons.push(`description is too short (${wordCount} words)`);
  }

  const overlap = titleOverlap(plain, product.Name || "");
  if (overlap > MAX_TITLE_OVERLAP) {
    reasons.push(`description mostly repeats the title (${Math.round(overlap * 100)}%)`);
  }

  const productDataBlob = [
    product.Name,
    product.Categories,
    product['Choose Your Style'],
    product['Choose Your Style Data'],
    product.Description,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  for (const [pattern, reason] of UNSUPPORTED_SPEC_PATTERNS) {
    const match = plain.match(pattern);
    if (match && !productDataBlob.includes(match[0].toLowerCase())) {
      reasons.push(`unsupported ${reason}`);
      break;
    }
  }

  // Research context words with nothing behind them are the hardest fabrication to
  // spot by eye, so they get their own check.
  const lower = plain.toLowerCase();
  const bareMarkers = CONTEXTUAL_MARKERS.filter((marker) => lower.includes(marker));
  if (hasResearch && bareMarkers.length > 1) {
    reasons.push("states event details that need verification");
  }

  return { ok: reasons.length === 0, reasons };
}
