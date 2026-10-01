import { connectToDatabase } from "@/lib/mongodb";
import { RESEARCH_TOPICS_COLLECTION } from "@/constant/collections";
import { ResearchTopic } from "@/types/research";

let indexEnsured = false;

async function ensureTopicIndex() {
  if (indexEnsured) {
    return;
  }

  const { db } = await connectToDatabase();

  // One index in the repo already sets the precedent (`revenueHistory.ts`).
  // `topicKey` is the natural key: one research record per topic, re-researched
  // in place when it goes stale rather than duplicated.
  await db
    .collection(RESEARCH_TOPICS_COLLECTION)
    .createIndex({ topicKey: 1 }, { unique: true })
    .catch(() => undefined);

  await db
    .collection(RESEARCH_TOPICS_COLLECTION)
    .createIndex({ aliases: 1 })
    .catch(() => undefined);

  await db
    .collection(RESEARCH_TOPICS_COLLECTION)
    .createIndex({ expiresAt: 1 })
    .catch(() => undefined);

  indexEnsured = true;
}

/**
 * A provisional key is what we know before searching, so a topic is looked up by
 * its final key or by any provisional key that later resolved to it.
 */
export async function findFreshTopic(keys: string[]): Promise<ResearchTopic | null> {
  const usable = keys.filter(Boolean);
  if (!usable.length) {
    return null;
  }

  await ensureTopicIndex();
  const { db } = await connectToDatabase();

  const doc = await db
    .collection(RESEARCH_TOPICS_COLLECTION)
    .findOne({
      $or: [{ topicKey: { $in: usable } }, { aliases: { $in: usable } }],
    });

  if (!doc) {
    return null;
  }

  const topic = { ...doc, _id: doc._id.toString() } as ResearchTopic;

  if (topic.expiresAt && Date.parse(topic.expiresAt) <= Date.now()) {
    return null;
  }

  return topic;
}

export async function saveTopic(topic: ResearchTopic): Promise<void> {
  await ensureTopicIndex();
  const { db } = await connectToDatabase();

  // `createdAt` must not appear in `$set` as well: Mongo rejects the same path in
  // both operators on an upsert.
  const { _id, createdAt, ...rest } = topic;

  await db
    .collection(RESEARCH_TOPICS_COLLECTION)
    .updateOne(
      { topicKey: topic.topicKey },
      {
        $set: rest,
        $setOnInsert: { createdAt },
      },
      { upsert: true },
    );
}

export async function listTopics(limit = 50): Promise<ResearchTopic[]> {
  await ensureTopicIndex();
  const { db } = await connectToDatabase();

  const docs = await db
    .collection(RESEARCH_TOPICS_COLLECTION)
    .find({})
    .sort({ updatedAt: -1 })
    .limit(limit)
    .toArray();

  return docs.map((doc) => ({ ...doc, _id: doc._id.toString() })) as ResearchTopic[];
}
