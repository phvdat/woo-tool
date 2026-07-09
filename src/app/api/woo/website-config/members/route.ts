import { WEBSITES_COLLECTION } from '@/constant/collections';
import { connectToDatabase } from '@/lib/mongodb';
import { WebsiteConfig } from '@/types/woo';
import { ObjectId } from 'mongodb';


export interface WooWebsitePayload extends WebsiteConfig {
  _id?: string;
}

export async function GET(request: Request) {
}
export async function POST(request: Request) {
  const body = await request.json();
  const { websiteId, newMemberEmail } = body;
  let { db } = await connectToDatabase();
  const result = await db.collection(WEBSITES_COLLECTION).updateOne(
    { _id: new ObjectId(websiteId) },
    {
      $addToSet: { members: newMemberEmail.toLowerCase() }
    }
  );

  return Response.json(result, { status: 200 });
}