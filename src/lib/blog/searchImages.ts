import { formatImages } from "@/helper/format-image";
import puppeteer from "puppeteer";

export async function searchBingImages(
  keyword: string,
  limit = 4
): Promise<string[]> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36"
    );
    await page.setExtraHTTPHeaders({
      "Accept-Language": "en-US,en;q=0.9",
    });
    await page.setViewport({
      width: 1600,
      height: 900,
    });

    await page.goto(
      `https://www.bing.com/images/search?q=${encodeURIComponent(keyword)}`,
    );

    const results = new Set<string>();

    let lastCount = 0;

    while (results.size < limit) {
      // Bing để metadata trong phần tử a.iusc
      const urls = await page.$$eval(".iusc", (els) => {
        const images: string[] = [];

        for (const el of els) {
          const m = el.getAttribute("m");

          if (!m) continue;

          try {
            const json = JSON.parse(m);

            // ảnh gốc
            if (json.murl) images.push(json.murl);

          } catch { }
        }

        return images;
      });

      urls.forEach((u) => results.add(u));

      if (results.size >= limit) break;

      const current = urls.length;

      if (current === lastCount) break;

      lastCount = current;

      await page.evaluate(() => {
        window.scrollBy(0, window.innerHeight * 2);
      });

      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    return Array.from(results).slice(0, limit);
  } finally {
    await browser.close();
  }
}