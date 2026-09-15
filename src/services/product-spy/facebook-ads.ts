import puppeteer from "puppeteer";
import { RawSpyProduct } from "@/types/product-spy";
import { GenericFetchResult } from "./generic";

const NAV_TIMEOUT = 30_000;
const SCROLL_DELAY = 1500;
const MAX_SCROLL_ATTEMPTS = 10;
const MAX_ADS = 30;
const NO_NEW_ADS_THRESHOLD = 3;

function buildAdsLibraryUrl(domain: string): string {
  const params = new URLSearchParams({
    active_status: "active",
    ad_type: "all",
    country: "US",
    is_targeted_country: "false",
    media_type: "all",
    q: domain,
    search_type: "keyword_unordered",
  });
  return `https://www.facebook.com/ads/library/?${params.toString()}&sort_data[direction]=desc&sort_data[mode]=total_impressions`;
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function resolveLynxUrl(href: string): string {
  try {
    if (href.includes("l.facebook.com/l.php")) {
      const u = new URL(href);
      return u.searchParams.get("u") || href;
    }
  } catch {}
  return href;
}

function normalizeLandingUrl(url: string): string {
  if (!url) return url;
  try {
    const u = new URL(url);
    // Strip common Facebook/tracking params
    const trackingParams = [
      "fbclid", "fb_action_ids", "fb_action_types", "fb_source",
      "fb_img_src", "fbc", "fb_audit_id", "campaign_id", "tt",
    ];
    for (const p of trackingParams) u.searchParams.delete(p);
    // Strip hash (often contains tracking fragments)
    u.hash = "";
    return u.href;
  } catch {
    return url;
  }
}

interface ExtractedAd {
  adLibraryId: string;
  advertiserName: string;
  headline: string;
  description: string;
  adCopy: string;
  image: string;
  landingUrl: string;
}

export async function fetchFacebookAdsProducts(
  domain: string
): Promise<GenericFetchResult> {
  const debug: string[] = [];
  const results: RawSpyProduct[] = [];
  const seenKeys = new Set<string>();

  const searchUrl = buildAdsLibraryUrl(domain);

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36"
    );
    await page.setViewport({ width: 1280, height: 900 });

    await page.goto(searchUrl, {
      waitUntil: "domcontentloaded",
      timeout: NAV_TIMEOUT,
    });

    // Wait for ad cards or detect login wall / empty state
    const hasAdCards = await page
      .waitForSelector('div[class*="xrvj5dj"]', { timeout: 10_000 })
      .then(() => true)
      .catch(() => false);

    if (!hasAdCards) {
      debug.push("No ad cards found — possible login wall, CAPTCHA, or empty results");
      return { products: [], debug };
    }

    // Scroll incrementally, collecting ads after each scroll
    let consecutiveNoNew = 0;
    for (let i = 0; i < MAX_SCROLL_ATTEMPTS; i++) {
      if (results.length >= MAX_ADS) break;

      const newAds = await page.evaluate(() => {
        const items: ExtractedAd[] = [];

        // Each ad card is a div with class containing "xrvj5dj"
        const adCards = Array.from(
          document.querySelectorAll('div[class*="xrvj5dj"]')
        );

        for (const card of adCards) {
          // --- Ad Library ID ---
          // Found in span text like "ID thư viện: 1060730256738015" or "Ad Library ID: ..."
          let adLibraryId = "";
          const allSpans = Array.from(card.querySelectorAll("span"));
          for (const span of allSpans) {
            const text = span.textContent?.trim() || "";
            const idMatch = text.match(
              /(?:ID thư viện|Ad Library ID|library ID)\s*:\s*(\d+)/i
            );
            if (idMatch) {
              adLibraryId = idMatch[1];
              break;
            }
          }

          // --- Advertiser name ---
          // Found in <a> linking to facebook.com/{page_id}/ with a <span> child
          let advertiserName = "";
          const pageLinks = Array.from(
            card.querySelectorAll('a[href*="facebook.com/"]')
          );
          for (const a of pageLinks) {
            const href = a.getAttribute("href") || "";
            // Match facebook.com/{numeric_id}/ pattern (page link, not ad link)
            if (/facebook\.com\/\d+\/?$/.test(href)) {
              const span = a.querySelector("span");
              if (span) {
                advertiserName = span.textContent?.trim() || "";
              }
              break;
            }
          }

          // --- Ad copy text ---
          // Found in ._4ik4._4ik5 divs with line-height: 16px (the larger text block)
          let adCopy = "";
          const adCopyDivs = Array.from(
            card.querySelectorAll('div._4ik4._4ik5[style*="line-height: 16px"]')
          );
          if (adCopyDivs.length > 0) {
            adCopy = adCopyDivs[0].textContent?.trim() || "";
          }

          // --- Main creative image ---
          // Large <img> inside the creative card area (._7jyr._a25-)
          let image = "";
          const creativeArea = card.querySelector("div._7jyr, div._a25-");
          if (creativeArea) {
            const imgs = Array.from(creativeArea.querySelectorAll("img"));
            // Pick the largest img (by class hints or first non-icon)
            for (const img of imgs) {
              const src = img.getAttribute("src") || "";
              if (src && !src.includes("mask-image") && src.includes("fbcdn")) {
                image = src;
                break;
              }
            }
          }

          // --- Headline and description from creative card ---
          // Inside ._7jyr._a25- area, the ._4ik4._4ik5 divs are ordered:
          //   [0] = destination domain (e.g. "ULTIMATESPORTSGIFT.COM")
          //   [1] = actual headline
          //   [2] = description
          //   [3+] = CTA body / empty text
          let headline = "";
          let description = "";
          if (creativeArea) {
            const cardTextDivs = Array.from(
              creativeArea.querySelectorAll('div._4ik4._4ik5')
            ).filter((d) => {
              const text = d.textContent?.trim() || "";
              return text.length > 0;
            });
            if (cardTextDivs.length >= 2) {
              headline = cardTextDivs[1].textContent?.trim() || "";
            }
            if (cardTextDivs.length >= 3) {
              description = cardTextDivs[2].textContent?.trim() || "";
            }
          }

          // --- Landing URL ---
          // Found in <a> with data-lynx-uri attribute or href containing l.facebook.com/l.php
          // Also check direct external hrefs
          let landingUrl = "";
          const allLinks = Array.from(card.querySelectorAll("a[href]"));
          for (const a of allLinks) {
            const lynxUri = a.getAttribute("data-lynx-uri") || "";
            if (lynxUri) {
              landingUrl = resolveLynxUrl(lynxUri);
              break;
            }
            const href = a.getAttribute("href") || "";
            if (href.includes("l.facebook.com/l.php")) {
              landingUrl = resolveLynxUrl(href);
              break;
            }
          }
          // Fallback: look for direct external links (non-facebook)
          if (!landingUrl) {
            for (const a of allLinks) {
              const href = a.getAttribute("href") || "";
              if (
                href.startsWith("http") &&
                !href.includes("facebook.com") &&
                !href.includes("fbcdn")
              ) {
                landingUrl = href;
                break;
              }
            }
          }

          // Skip cards that don't have meaningful content
          if (!headline && !adCopy && !image) continue;

          items.push({
            adLibraryId,
            advertiserName,
            headline,
            description,
            adCopy,
            image,
            landingUrl,
          });
        }

        return items;
      });

      // Deduplicate by normalized landingUrl + image + headline
      let addedCount = 0;
      for (const ad of newAds) {
        const normalizedUrl = normalizeLandingUrl(ad.landingUrl);
        const dedupeKey = [
          normalizedUrl,
          ad.image,
          ad.headline,
        ].join("|||");

        if (seenKeys.has(dedupeKey)) continue;
        seenKeys.add(dedupeKey);

        const title = ad.headline || ad.advertiserName || `Ad from ${domain}`;
        const url = normalizedUrl || `https://${domain}`;

        results.push({
          title: title.substring(0, 200),
          url,
          normalizedUrl: url,
          image: ad.image || undefined,
          images: ad.image ? [ad.image] : [],
          source: "facebook-ads",
        });

        addedCount++;
        if (results.length >= MAX_ADS) break;
      }

      if (addedCount === 0) {
        consecutiveNoNew++;
        if (consecutiveNoNew >= NO_NEW_ADS_THRESHOLD) break;
      } else {
        consecutiveNoNew = 0;
      }

      // Scroll down — try inner scrollable container first, fallback to main page
      await page.evaluate(() => {
        // Facebook Ads Library may use an inner scroll container
        const scrollable = document.querySelector(
          'div[role="main"] div[style*="overflow"]'
        ) as HTMLElement | null;
        if (scrollable && scrollable.scrollHeight > scrollable.clientHeight) {
          scrollable.scrollBy(0, scrollable.clientHeight);
        } else {
          window.scrollBy(0, window.innerHeight);
        }
      });
      await new Promise((r) => setTimeout(r, SCROLL_DELAY));
    }

    debug.push(`Extracted ${results.length} product(s) from Facebook Ads Library`);
  } catch (err: any) {
    debug.push(`Facebook Ads Library error: ${err?.message || "unknown"}`);
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }

  return { products: results, debug };
}
