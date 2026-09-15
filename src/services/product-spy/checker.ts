import { connectToDatabase } from "@/lib/mongodb";
import {
  SPY_COMPETITORS_COLLECTION,
  SPY_PRODUCTS_COLLECTION,
  SPY_TELEGRAM_CONFIG_COLLECTION,
} from "@/constant/collections";
import { SpyCompetitor } from "@/types/product-spy";
import { fetchProducts } from "./detector";
import {
  sendNewProductNotification,
  shouldNotifyProduct,
} from "./telegram-notifier";
import { ObjectId } from "mongodb";
import { getErrorMessage } from "@/lib/error-utils";

export async function checkCompetitor(competitor: SpyCompetitor): Promise<void> {
  const { db } = await connectToDatabase();
  const compId = competitor._id!;

  try {
    const { products, debug } = await fetchProducts(competitor.url, competitor.platform);

    if (products.length === 0) {
      const now = new Date().toISOString();
      const debugInfo = debug.length > 0 ? `\nDebug: ${debug.join("; ")}` : "";
      await db
        .collection(SPY_COMPETITORS_COLLECTION)
        .updateOne(
          { _id: new ObjectId(compId) },
          {
            $set: {
              lastCheckAt: now,
              lastStatus: "error",
              lastError: `No products found from this competitor. The crawler may not be able to detect this site's products.${debugInfo}`,
            },
          }
        );
      return;
    }

    const productCol = db.collection(SPY_PRODUCTS_COLLECTION);

    const telegramConfig = await db
      .collection(SPY_TELEGRAM_CONFIG_COLLECTION)
      .findOne({});

    const isFirstScan = !competitor.lastCheckAt;

    for (const product of products) {
      const existing = await productCol.findOne({
        competitorId: compId,
        $or: [
          ...(product.externalId
            ? [{ externalId: product.externalId }]
            : []),
          ...(product.url
            ? [{ normalizedUrl: product.url.toLowerCase().replace(/\/+$/, "") }]
            : []),
        ],
      });

      if (existing) {
        if (
          !existing.notifiedAt &&
          !isFirstScan &&
          telegramConfig?.chatId &&
          shouldNotifyProduct(product.title)
        ) {
          const sent = await sendNewProductNotification(
            telegramConfig.chatId,
            competitor,
            {
              title: product.title,
              price: product.price,
              url: product.url,
              image: product.image,
              firstSeenAt: existing.firstSeenAt || new Date().toISOString(),
            }
          );
          if (sent) {
            await productCol.updateOne(
              { _id: existing._id },
              { $set: { notifiedAt: new Date().toISOString() } }
            );
          }
        }
        continue;
      }

      const now = new Date().toISOString();
      const newProduct = {
        competitorId: compId,
        externalId: product.externalId,
        normalizedUrl: (product.url || product.normalizedUrl || "")
          .toLowerCase()
          .replace(/\/+$/, ""),
        title: product.title,
        url: product.url,
        slug: product.slug,
        price: product.price,
        image: product.image,
        images: product.images,
        dateCreated: product.dateCreated,
        source: product.source,
        firstSeenAt: now,
        notifiedAt: null,
      };

      const result = await productCol.insertOne(newProduct as any);

      if (!isFirstScan && telegramConfig?.chatId && shouldNotifyProduct(product.title)) {
        const sent = await sendNewProductNotification(
          telegramConfig.chatId,
          competitor,
          {
            title: product.title,
            price: product.price,
            url: product.url,
            image: product.image,
            firstSeenAt: now,
          }
        );
        if (sent) {
          await productCol.updateOne(
            { _id: result.insertedId },
            { $set: { notifiedAt: new Date().toISOString() } }
          );
        }
      }
    }

    await db
      .collection(SPY_COMPETITORS_COLLECTION)
      .updateOne(
        { _id: new ObjectId(compId) },
        {
          $set: {
            lastCheckAt: new Date().toISOString(),
            lastStatus: "success",
            lastError: null,
          },
        }
      );
  } catch (err: any) {
    console.error(`[PRODUCT-SPY] Check failed for ${competitor.name}: ${getErrorMessage(err)}`);
    await db
      .collection(SPY_COMPETITORS_COLLECTION)
      .updateOne(
        { _id: new ObjectId(compId) },
        {
          $set: {
            lastCheckAt: new Date().toISOString(),
            lastStatus: "error",
            lastError: err?.message || "Unknown error",
          },
        }
      );
  }
}

export async function checkAllEnabledCompetitors(): Promise<void> {
  const { db } = await connectToDatabase();
  const competitors = await db
    .collection(SPY_COMPETITORS_COLLECTION)
    .find({ enabled: true })
    .toArray();

  const MAX_CONCURRENT = 3;
  let running = 0;
  const queue: Array<() => void> = [];

  function runNext() {
    if (queue.length === 0 || running >= MAX_CONCURRENT) return;
    running++;
    const next = queue.shift()!;
    next();
  }

  const done = new Promise<void>((resolve) => {
    let completed = 0;
    const total = competitors.length;
    if (total === 0) {
      resolve();
      return;
    }

    for (const comp of competitors) {
      const task = async () => {
        try {
          await checkCompetitor(comp as unknown as SpyCompetitor);
        } finally {
          completed++;
          running--;
          if (completed >= total) {
            resolve();
          } else {
            runNext();
          }
        }
      };
      queue.push(() => {
        task();
      });
    }
    runNext();
  });

  await done;
}
