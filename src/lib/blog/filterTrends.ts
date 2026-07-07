import { Trend } from "./types";

const blacklist = [
  "weather",
  "stock",
  "mortgage",
  "lawsuit",
  "hospital",
  "flight",
  "warning",
  "earthquake",
  "fire",
  "flood",
  "tax",
  "social security",
];

export function filterTrends(trends: Trend[]) {
  return trends
    .filter((t) => t.traffic >= 20000)
    .filter(
      (t) =>
        !blacklist.some((word) =>
          t.keyword.toLowerCase().includes(word)
        )
    )
    .sort((a, b) => b.traffic - a.traffic)
    .slice(0, 100);
}