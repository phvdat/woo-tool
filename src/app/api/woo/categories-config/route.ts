import { CategoryFormValue } from '@/components/woo/UpdateCategoryModal';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

const CATEGORIES_COLLECTION = 'categories';

export interface WooCategoryPayload extends CategoryFormValue {
  _id?: string;
}

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const searchKeyword = searchParams.get('searchKeyword') || '';
  let { db } = await connectToDatabase();
  const response = await db
    .collection(CATEGORIES_COLLECTION)
    .find({
      $or: [
        { templateName: { $regex: searchKeyword, $options: 'i' } },
        { category: { $regex: searchKeyword, $options: 'i' } },
        { shopID: { $regex: searchKeyword, $options: 'i' } },
      ],
    })
    .toArray();
  return Response.json(response, { status: 200 });
}

export async function POST(request: Request) {
  try {
    const payload: WooCategoryPayload = await request.json();
    const { _id, ...rest } = payload;
    let { db } = await connectToDatabase();
    const response = await db.collection(CATEGORIES_COLLECTION).insertOne(rest);
    return Response.json(response, { status: 200 });
  } catch (error) {
    console.log(error);

    return Response.json(error, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const payload: WooCategoryPayload = await request.json();
  const { _id, ...rest } = payload;
  let { db } = await connectToDatabase();
  const response = await db
    .collection(CATEGORIES_COLLECTION)
    .updateOne({ _id: new ObjectId(_id) }, { $set: rest });
  return Response.json(response, { status: 200 });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const _id = searchParams.get('_id')?.toString();

  let { db } = await connectToDatabase();
  const response = await db
    .collection(CATEGORIES_COLLECTION)
    .findOneAndDelete({ _id: new ObjectId(_id) });
  return Response.json(response, { status: 200 });
}
