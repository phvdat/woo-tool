import { WEBSITES_COLLECTION } from "@/constant/collections";
import { formatImages } from "@/helper/format-image";
import { connectToDatabase } from "@/lib/mongodb";
import { WebsiteConfig } from "@/types/woo";
import { filterTrends } from "./filterTrends";
import { getNewsContext } from "./getNewsContext";
import { getGoogleTrends } from "./getTrends";
import {
  getUsedKeywords,
  saveKeyword,
} from "./history";
import { searchBingImages } from "./searchImages";
import { selectTrends } from "./selectTrends.ts";
import { SelectedTrend } from "./types";
import { publishWordpress, uploadImagesToWordpress } from "./wordpress";
import { insertImages, writeBlog } from "./writer";

function normalizeKeyword(keyword: string) {
  return keyword.trim().toLowerCase();
}
let running = false;


export async function runAllWebBlogs() {
  if (running) {
    console.log("[AUTO BLOG] Already running");
    return;
  }
  running = true;
  try {
    const { db } = await connectToDatabase();
    const websites: WebsiteConfig[] = await db
      .collection(WEBSITES_COLLECTION)
      .find({
        "autoBlog.enabled": true,
      })
      .toArray();

    if (!websites.length) {
      return Response.json(
        {
          success: true,
          message: "No website enabled auto blog",
        },
        { status: 200 }
      );
    }

    const trends = filterTrends(await getGoogleTrends());
    const selected = await selectTrends(
      trends,
      websites[0].autoBlog.keywords,
      10
    );
    const usedKeywords = new Set<string>();

    for (const website of websites) {
      await runAutoBlog(
        website,
        selected,
        usedKeywords
      );
    }
  } finally {
    running = false;
  }
}

export async function runAutoBlog(
  website: WebsiteConfig,
  selected: SelectedTrend[],
  usedKeywords: Set<string>
) {
  if (!website.autoBlog.enabled) {
    return;
  }
  const historyKeywords = await getUsedKeywords(
    selected.map((e: any) => e.keyword)
  );
  let published = 0;
  for (const trend of selected) {
    if (published >= website.autoBlog.postsPerRun) {
      break;
    }
    const keyword = normalizeKeyword(trend.keyword);
    if (usedKeywords.has(keyword)) {
      continue;
    }
    if (historyKeywords.has(keyword)) {
      continue;
    }
    try {
      const news = await getNewsContext(trend.keyword);

      const article = await writeBlog(
        trend,
        news,
        website
      );
      // insert images
      const images = await searchBingImages(article.title);
      const { images: formatImgs } = await formatImages({ websiteObject: website, name: article.title, images })
      if (!formatImgs?.length) {
        console.log(
          `[AUTO BLOG] Skip "${trend.keyword}" because no valid images were found`
        );
        continue;
      }
      const medias = await uploadImagesToWordpress(
        website,
        formatImgs
      );

      if (!medias?.length) {
        console.log(
          `[AUTO BLOG] Skip "${trend.keyword}" because image upload failed`
        );
        continue;
      }
      article.content = insertImages(
        article.content,
        medias.map(item => item.source_url),
        article.title
      );

      await publishWordpress(
        website,
        article,
        medias[0]?.id
      );
      await saveKeyword(keyword);
      usedKeywords.add(keyword);
      historyKeywords.add(keyword);
      published++;
      console.log(
        `[AUTO BLOG] ${website.shopName}: ${keyword}`
      );
    } catch (err) {
      console.error(err);
    }
  }
}