import { StoreCollection } from '@/app/hooks/store/useStore';
import { STORE_COLLECTION, USER_COLLECTION } from '@/constant/commons';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const _id = params.id;
  let { db } = await connectToDatabase();
  const response = await db
    .collection(STORE_COLLECTION)
    .findOne({ _id: new ObjectId(_id) });
  return Response.json(response, { status: 200 });
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const _id = params.id;
  const payload: StoreCollection & { _userId: string } = await request.json();
  const { _userId, ...rest } = payload;
  let { db } = await connectToDatabase();
  const response = await db
    .collection(STORE_COLLECTION)
    .updateOne({ _id: new ObjectId(_id) }, { $set: rest });
  await db
    .collection(USER_COLLECTION)
    .updateOne(
      { _id: new ObjectId(_userId), 'stores._id': _id },
      { $set: { 'stores.$.storeName': payload.watermark.shopName } }
    );
  return Response.json(response, { status: 200 });
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { searchParams } = new URL(request.url);
  const _userId = searchParams.get('_userId')?.toString();
  const _id = params.id;
  let { db } = await connectToDatabase();
  const response = await db
    .collection(STORE_COLLECTION)
    .findOneAndDelete({ _id: new ObjectId(_id) });

  await db.collection(USER_COLLECTION).updateOne(
    { _id: new ObjectId(_userId) },
    // @ts-ignore
    { $pull: { stores: { _id: _id } } }
  );
  return Response.json(response, { status: 200 });
}
