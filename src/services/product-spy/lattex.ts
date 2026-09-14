import axios from "axios";
import { JSDOM } from "jsdom";
import { RawSpyProduct } from "@/types/product-spy";

const UA = "WooTool-ProductSpy/1.0";
const REQUEST_TIMEOUT = 12000;
const MAX_PRODUCTS = 100;

interface LattexProduct {
  id?: string | number;
  title?: string;
  name?: string;
  slug?: string;
  handle?: string;
  price?: string | number;
  compare_at_price?: string | number;
  image?: string;
  images?: string[];
  created_at?: string;
  published_at?: string;
  url?: string;
}

export async function isLattexStore(
  url: string
): Promise<{ detected: boolean; reason: string }> {
  const baseUrl = url.replace(/\/+$/, "");

  // 1. Check homepage HTML for Lattex signals
  try {
    const { data: html } = await axios.get(baseUrl, {
      timeout: 10000,
      headers: { "User-Agent": UA },
    });

    if (typeof html === "string") {
      // Strong signal: Lattex in page title
      const dom = new JSDOM(html);
      const { document } = dom.window;
      const title = document.querySelector("title")?.textContent || "";
      if (/Lattex/i.test(title)) {
        return { detected: true, reason: "Lattex found in page title" };
      }

      // Strong signal: Lattex CDN or script references
      if (/lattex\.(com|io|net)|cdn\.lattex/i.test(html)) {
        return { detected: true, reason: "Lattex CDN assets found" };
      }

      // Check for Lattex-specific meta tags
      const metaGenerator = document.querySelector('meta[name="generator"]');
      if (/lattex/i.test(metaGenerator?.getAttribute("content") || "")) {
        return { detected: true, reason: "Lattex generator meta tag found" };
      }

      // Check for Lattex in body class or data attributes
      const body = document.querySelector("body");
      const bodyClass = body?.className || "";
      if (/lattex/i.test(bodyClass)) {
        return { detected: true, reason: "Lattex body class detected" };
      }

      // Check for powered by Lattex footer text
      if (/powered\s+by\s+lattex/i.test(html)) {
        return { detected: true, reason: "Powered by Lattex found in page" };
      }

      // Check for Lattex JavaScript globals
      const scriptsInline = document.querySelectorAll('script:not([src])');
      for (const s of Array.from(scriptsInline)) {
        const text = s.textContent || "";
        if (/lattex|window\.lattex/i.test(text)) {
          return { detected: true, reason: "Lattex JavaScript globals detected" };
        }
      }
    }
  } catch {
    // homepage fetch failed
  }

  return { detected: false, reason: "No Lattex signals detected" };
}

export async function fetchLattexProducts(
  url: string
): Promise<RawSpyProduct[]> {
  const baseUrl = url.replace(/\/+$/, "");
  const allProducts: RawSpyProduct[] = [];

  // Fetch the homepage
  try {
    const { data: html } = await axios.get(baseUrl, {
      timeout: REQUEST_TIMEOUT,
      headers: { "User-Agent": UA },
    });

    if (typeof html !== "string") return allProducts;

    const dom = new JSDOM(html);
    const { document } = dom.window;

    // Extract product links from the page
    const links = document.querySelectorAll('a[href]');
    const productUrls = new Set<string>();

    for (const link of Array.from(links)) {
      const href = link.getAttribute("href") || "";
      if (!href) continue;

      const fullUrl = href.startsWith("http")
        ? href
        : `${baseUrl}${href.startsWith("/") ? "" : "/"}${href}`;

      // Skip non-product links
      if (fullUrl === baseUrl) continue;
      if (fullUrl.includes("/cart")) continue;
      if (fullUrl.includes("/checkout")) continue;
      if (fullUrl.includes("/account")) continue;
      if (fullUrl.includes("/collections")) continue;

      productUrls.add(fullUrl);
    }

    // Fetch each product page to extract data
    for (const productUrl of Array.from(productUrls).slice(0, MAX_PRODUCTS)) {
      try {
        const { data: productHtml } = await axios.get(productUrl, {
          timeout: REQUEST_TIMEOUT,
          headers: { "User-Agent": UA },
        });

        if (typeof productHtml !== "string") continue;

        const productDom = new JSDOM(productHtml);
        const { document: productDoc } = productDom.window;

        // Extract title
        const title =
          productDoc.querySelector("h1")?.textContent?.trim() ||
          productDoc.querySelector('meta[property="og:title"]')?.getAttribute("content") ||
          "";

        if (!title) continue;

        // Extract price
        const priceEl = productDoc.querySelector('[itemprop="price"]');
        const priceContent = priceEl?.getAttribute("content") || "";
        const priceText = productDoc.querySelector(".price")?.textContent?.trim() || "";
        const price = priceContent || priceText.replace(/[^0-9.,]/g, "") || undefined;

        // Extract image
        const ogImage = productDoc.querySelector('meta[property="og:image"]');
        const image = ogImage?.getAttribute("content") || undefined;

        // Extract product ID from URL or meta
        const productId =
          productDoc.querySelector('[itemprop="productID"]')?.getAttribute("content") ||
          productUrl.split("/").pop()?.split("?")[0] ||
          undefined;

        allProducts.push({
          externalId: productId,
          title,
          url: productUrl,
          slug: productUrl.split("/").pop()?.split("?")[0] || undefined,
          price,
          image,
          images: image ? [image] : [],
          source: "lattex",
        });
      } catch {
        continue;
      }
    }
  } catch {
    // fetch failed
  }

  return allProducts;
}
