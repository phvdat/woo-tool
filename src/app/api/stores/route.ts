import { StoreCollection } from '@/app/hooks/store/useStore';
import { STORE_COLLECTION, USER_COLLECTION } from '@/constant/commons';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET() {
  let { db } = await connectToDatabase();
  const response = await db.collection(STORE_COLLECTION).find().toArray();
  return Response.json(response, { status: 200 });
}

export async function POST(request: Request) {
  try {
    const payload: Omit<StoreCollection, '_id'> & { _userId: string } =
      await request.json();
    let { db } = await connectToDatabase();
    const response = await db.collection(STORE_COLLECTION).insertOne(payload);

    await db.collection(USER_COLLECTION).updateOne(
      { _id: new ObjectId(payload._userId) },
      {
        // @ts-ignore
        $push: {
          stores: {
            _id: response.insertedId.toString(),
            storeName: payload.watermark.shopName,
          },
        },
      }
    );

    return Response.json(response, { status: 200 });
  } catch (error) {
    console.log(error);

    return Response.json(error, { status: 500 });
  }
}
