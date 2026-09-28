export const APPAREL_KEYWORDS = [
  // General apparel
  "apparel",
  "clothing",
  "clothes",
  "tee",
  "tees",
  "tshirt",
  "t-shirt",
  "shirt",
  "tank",
  "tank top",
  "jersey",
  "hoodie",
  "sweatshirt",
  "sweater",
  "crewneck",
  "pullover",
  "jacket",
  "vest",
  "windbreaker",
  "varsity",
  "cardigan",
  "long sleeve",
  "crop top",
  "polo",

  // Sports / fan apparel
  "baseball",
  "football",
  "basketball",
  "hockey",
  "soccer",
  "softball",
  "uniform",
  "fanwear",
  "sportswear",

  // League / sports abbreviations
  "mlb",
  "nfl",
  "nhl",
  "nba",
  "wnba",
  "ncaa",
  "nascar",
  "mls",
  "nrl",
  "afl",

  // Sneakers / shoes
  "sneaker",
  "sneakers",
  "shoe",
  "shoes",
  "footwear",
  "af1",
  "air force",
  "air jordan",
  "aj1",
  "aj",
  "jordan",
  "dunk",
  "air max",
  "air max plus",
  "tn",
  "trainer",
  "trainers",
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const APPAREL_TITLE_REGEX = new RegExp(
  APPAREL_KEYWORDS.map(escapeRegExp).join("|"),
  "i",
);
