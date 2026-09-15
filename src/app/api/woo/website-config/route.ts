import { WEBSITES_COLLECTION } from '@/constant/collections';
import { authOptions } from '@/lib/auth';
import { syncBlogCrons } from '@/lib/blog/startBlogCron';
import { connectToDatabase } from '@/lib/mongodb';
import { WooWebsitePayload } from '@/types/woo';
import { ObjectId } from 'mongodb';
import { getServerSession } from 'next-auth';


export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return Response.json({}, { status: 401 });
  }
  const userEmail = session.user.email;
  let { db } = await connectToDatabase();
  let query: any = {};
  if (!userEmail) {
    return Response.json([], { status: 200 });
  }
  query = {
    $or: [
      { owner: userEmail.toLowerCase() },
      { members: userEmail.toLowerCase() }
    ]
  };
  const response = await db
    .collection(WEBSITES_COLLECTION)
    .find(query)
    .toArray();

  return Response.json(response, { status: 200 });
}
export async function POST(request: Request) {
  try {
    const payload: WooWebsitePayload = await request.json();
    const { _id, ...rest } = payload;
    let { db } = await connectToDatabase();
    const response = await db.collection(WEBSITES_COLLECTION).insertOne(rest);
    return Response.json(response, { status: 200 });
  } catch (error: any) {
    console.error(`[WEBSITE CONFIG] ${error?.message || 'Create failed'}`);
    return Response.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const payload: WooWebsitePayload = await request.json();
  const { _id, ...rest } = payload;
  let { db } = await connectToDatabase();
  const response = await db
    .collection(WEBSITES_COLLECTION)
    .updateOne({ _id: new ObjectId(_id) }, { $set: rest });
  await syncBlogCrons();
  return Response.json(response, { status: 200 });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const _id = searchParams.get('_id')?.toString();

  let { db } = await connectToDatabase();
  const response = await db
    .collection(WEBSITES_COLLECTION)
    .findOneAndDelete({ _id: new ObjectId(_id) });
  return Response.json(response, { status: 200 });
}
