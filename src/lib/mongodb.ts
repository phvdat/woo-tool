import { MongoClient, Db } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI!;
const MONGODB_DB = process.env.MONGODB_DB!;

if (!MONGODB_URI)
  throw new Error('Define the MONGODB_URI environmental variable');
if (!MONGODB_DB)
  throw new Error('Define the MONGODB_DB environmental variable');

// Biến toàn cục để giữ kết nối qua các reloads
let cached = (global as any)._mongo || { client: null, db: null };

export async function connectToDatabase() {
  if (cached.client && cached.db) {
    return { client: cached.client, db: cached.db };
  }

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(MONGODB_DB);

  cached = { client, db };
  (global as any)._mongo = cached;

  return { client, db };
}
