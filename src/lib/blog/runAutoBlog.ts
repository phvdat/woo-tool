import { WEBSITES_COLLECTION } from "@/constant/collections";
import { formatImages } from "@/helper/format-image";
import { connectToDatabase } from "@/lib/mongodb";
import { WebsiteConfig } from "@/types/woo";
import { getNewsContext } from "./getNewsContext";
import {
  getUsedKeywords,
  saveKeyword,
} from "./history";
import { searchBingImages } from "./searchImages";
import { getCachedTrends, selectTrends } from "./selectTrends.ts";
import { publishWordpress, uploadImagesToWordpress } from "./wordpress";
import { insertImages, writeBlog } from "./writer";

function normalizeKeyword(keyword: string) {
  return keyword.trim().toLowerCase();
}
const runningWebsites = new Set<string>();

export async function runAllWebBlogs() {
  const { db } = await connectToDatabase();

  const websites: WebsiteConfig[] = await db
    .collection(WEBSITES_COLLECTION)
    .find({
      "autoBlog.enabled": true,
    })
    .toArray();

  for (const website of websites) {
    await runAutoBlog(website);
  }
}

export async function runAutoBlog(website: WebsiteConfig) {
  if (!website.autoBlog.enabled) {
    return;
  }
  const websiteKey = website.shopName;
  if (runningWebsites.has(websiteKey)) {
    console.log(
      `[AUTO BLOG] ${website.shopName}: Already running`
    );
    return;
  }
  runningWebsites.add(websiteKey);
  try {
    const trends = await getCachedTrends();
    const selected = await selectTrends(trends, 10);
    const historyKeywords = await getUsedKeywords(
      selected.map((e) => e.keyword)
    );
    let published = 0;
    for (const trend of selected) {
      if (published >= website.autoBlog.postsPerRun) {
        break;
      }
      const keyword = normalizeKeyword(trend.keyword);
      if (historyKeywords.has(keyword)) {
        continue;
      }
      try {
        const news = await getNewsContext(trend.keyword);
        const article = await writeBlog(
          trend,
          news
        );
        const images = await searchBingImages(
          article.title,
          4
        );
        const { images: formatImgs } = await formatImages({
          websiteObject: website,
          name: article.title,
          images,
        });
        if (!formatImgs?.length) {
          console.log(
            `[AUTO BLOG] ${website.shopName}: No valid images`
          );
          continue;
        }
        const medias = await uploadImagesToWordpress(
          website,
          formatImgs
        );
        if (!medias?.length) {
          console.log(
            `[AUTO BLOG] ${website.shopName}: Image upload failed`
          );
          continue;
        }
        article.content = insertImages(
          article.content,
          medias.map((item) => item.source_url),
          article.title
        );
        await publishWordpress(
          website,
          article,
          medias[0]?.id
        );
        await saveKeyword(keyword);
        historyKeywords.add(keyword);
        published++;
        console.log(
          `[AUTO BLOG] ${website.shopName}: ${keyword}`
        );
      } catch (err) {
        console.error(
          `[AUTO BLOG] ${website.shopName}: Failed keyword ${keyword}`,
          err
        );
      }
    }
    console.log(
      `[AUTO BLOG] ${website.shopName}: Finished. Published ${published}`
    );
  } finally {
    runningWebsites.delete(websiteKey);
    console.log(
      `[AUTO BLOG] ${website.shopName}: Released`
    );
  }
}