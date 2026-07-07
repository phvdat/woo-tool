import { connectToDatabase } from "@/lib/mongodb";

const COLLECTION = "blog_history";

function normalizeKeyword(keyword: string) {
    return keyword.trim().toLowerCase();
}

export async function getUsedKeywords(keywords: string[]) {
  const { db } = await connectToDatabase();

  const docs = await db
    .collection(COLLECTION)
    .find({
      keyword: {
        $in: keywords.map(normalizeKeyword),
      },
      createdAt: {
        $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
    })
    .project({ keyword: 1 })
    .toArray();

  return new Set(docs.map((e: any) => e.keyword));
}

export async function saveKeyword(keyword: string) {
    const { db } = await connectToDatabase();

    await db.collection(COLLECTION).updateOne(
        {
            keyword: normalizeKeyword(keyword),
        },
        {
            $setOnInsert: {
                keyword: normalizeKeyword(keyword),
                createdAt: new Date(),
            },
        },
        {
            upsert: true,
        }
    );
}