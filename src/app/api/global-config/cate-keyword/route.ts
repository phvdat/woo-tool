import { CATE_KEYWORD_CONFIG_COLLECTION } from "@/constant/collections";
import { connectToDatabase } from "@/lib/mongodb";

export async function GET() {
  const { db } = await connectToDatabase();
  const data = await db
    .collection(CATE_KEYWORD_CONFIG_COLLECTION)
    .findOne({ _id: 'cate_keyword_config' } as any);

  return Response.json(data?.data || {});
}

export async function POST(request: Request) {
  const body = await request.json();
  const { db } = await connectToDatabase();

  await db.collection('global_config').updateOne(
    { _id: 'cate_keyword_config' } as any,
    {
      $set: {
        data: body,
        updatedAt: new Date()
      }
    },
    { upsert: true }
  );

  return Response.json({ success: true });
}