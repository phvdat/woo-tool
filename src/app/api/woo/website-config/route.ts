import { WebsiteFormValue } from '@/components/woo/UpdateWebsiteListModal';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

const WEBSITES_COLLECTION = 'watermark-websites';

export interface WooWebsitePayload extends WebsiteFormValue {
  _id?: string;
}

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const userEmail = searchParams.get('userEmail') || '';
  let { db } = await connectToDatabase();
  const response = await db.collection(WEBSITES_COLLECTION).find({
    owner: { $regex: userEmail, $options: 'i' }
  }).toArray();
  return Response.json(response, { status: 200 });
}

export async function POST(request: Request) {
  try {
    const payload: WooWebsitePayload = await request.json();
    const { _id, ...rest } = payload;
    let { db } = await connectToDatabase();
    const response = await db.collection(WEBSITES_COLLECTION).insertOne(rest);
    return Response.json(response, { status: 200 });
  } catch (error) {
    console.log(error);

    return Response.json(error, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const payload: WooWebsitePayload = await request.json();
  const { _id, ...rest } = payload;
  let { db } = await connectToDatabase();
  const response = await db
    .collection(WEBSITES_COLLECTION)
    .updateOne({ _id: new ObjectId(_id) }, { $set: rest });
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
