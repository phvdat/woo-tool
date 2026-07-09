import { publishWordpress, uploadImagesToWordpress } from "./wordpress";
import { Trend } from "./types";
import { WebsiteConfig } from "@/types/woo";
import { insertImages, writeBlog } from "./writer";
import {
  getUsedKeywords,
  saveKeyword,
} from "./history";
import { selectTrends } from "./selectTrends.ts";
import { searchBingImages } from "./searchImages";
import { formatImages } from "@/helper/format-image";

function normalizeKeyword(keyword: string) {
  return keyword.trim().toLowerCase();
}

export async function runAutoBlog(
  website: WebsiteConfig,
  trends: Trend[],
  usedKeywords: Set<string>
) {
  if (!website.autoBlog.enabled) {
    return;
  }
  const selected = await selectTrends(
    trends,
    website.autoBlog.keywords,
    10
  );
  const historyKeywords = await getUsedKeywords(
    selected.map((e: any) => e.keyword)
  );
  let published = 0;
  console.log(website.autoBlog.postsPerRun)
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

      const article = await writeBlog(
        trend,
        website
      );
      // insert images
      const images = await searchBingImages(
        keyword,
        4
      );
      const { images: formatImgs } = await formatImages({ websiteObject: website, name: article.title, images })

      const medias = await uploadImagesToWordpress(
        website,
        formatImgs
      );

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