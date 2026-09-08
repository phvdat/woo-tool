import puppeteer from "puppeteer";

type BingImage = {
  url: string;
  thumbnail?: string;
  title?: string;
  description?: string;
  source?: string;
};

const BLOCKED_TERMS = [
  "porn",
  "porno",
  "xxx",
  "sex",
  "sexual",
  "nude",
  "naked",
  "nsfw",
  "adult",
  "erotic",
  "hentai",
  "onlyfans",
  "boobs",
  "breast",
  "penis",
  "vagina",
  "dick",
  "pussy",
  "escort",
];

function containsBlockedTerm(value = "") {
  const text = value.toLowerCase();

  return BLOCKED_TERMS.some((term) => {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(
      text,
    );
  });
}

function isValidImageUrl(url: string) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function searchBingImages(
  title: string,
  limit = 10,
): Promise<string[]> {
  console.log("[BingSearch]: ", title);

  const browser = await puppeteer.launch({
    headless: false,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
    );
    await page.setExtraHTTPHeaders({
      "Accept-Language": "en-US,en;q=0.9",
    });
    await page.setViewport({
      width: 1600,
      height: 900,
    });
    const targetCandidates = Math.max(limit * 3, 30);
    const searchUrl =
      `https://www.bing.com/images/search` +
      `?q=${encodeURIComponent(title)}` +
      `&safeSearch=Strict`;
    await page.goto(searchUrl, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    const results = new Set<string>();
    let previousUniqueCount = 0;
    let noNewResultsCount = 0;
    while (results.size < targetCandidates) {
      const images = await page.$$eval(".iusc", (elements) => {
        const output: {
          url: string;
          thumbnail?: string;
          title?: string;
          description?: string;
          source?: string;
        }[] = [];
        for (const element of elements) {
          const raw = element.getAttribute("m");
          if (!raw) continue;
          try {
            const json = JSON.parse(raw);
            if (!json.murl) continue;
            output.push({
              url: json.murl,
              thumbnail: json.turl,
              title: json.t,
              description: json.desc,
              source: json.purl,
            });
          } catch {
            // Ignore invalid Bing metadata
          }
        }
        return output;
      });
      for (const image of images) {
        if (!isValidImageUrl(image.url)) {
          continue;
        }
        // Metadata dùng để phát hiện ảnh NSFW / nguồn đáng ngờ
        const metadata = [
          image.title,
          image.description,
          image.source,
          image.url,
        ]
          .filter(Boolean)
          .join(" ");
        if (containsBlockedTerm(metadata)) {
          continue;
        }
        results.add(image.url);
        if (results.size >= targetCandidates) {
          break;
        }
      }

      // Không có thêm ảnh mới
      if (results.size === previousUniqueCount) {
        noNewResultsCount++;
        if (noNewResultsCount >= 2) {
          break;
        }
      } else {
        noNewResultsCount = 0;
      }
      previousUniqueCount = results.size;
      if (results.size >= targetCandidates) {
        break;
      }
      await page.evaluate(() => {
        window.scrollBy(0, window.innerHeight * 2);
      });
      await new Promise((resolve) => setTimeout(resolve, 1200));
    }
    return Array.from(results).slice(0, limit);
  } finally {
    await browser.close();
  }
}