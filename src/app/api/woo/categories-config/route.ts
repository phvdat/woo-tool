import { CategoryFormValue } from '@/components/woo/UpdateCategoryModal';
import { STORE_COLLECTION, USER_COLLECTION } from '@/constant/commons';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

const CATEGORIES_COLLECTION = 'categories';

export interface CategoryCollection extends CategoryFormValue {
  _id?: string;
}

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const _id = searchParams.get('_id') || '';
  let { db } = await connectToDatabase();
  const response = await db
    .collection(CATEGORIES_COLLECTION)
    .findOne({ _id: new ObjectId(_id) });
  return Response.json(response, { status: 200 });
}

export async function POST(request: Request) {
  try {
    const payload: Omit<CategoryCollection, '_id'> & { storeId: string } =
      await request.json();
    const { storeId, ...rest } = payload;
    let { db } = await connectToDatabase();
    const response = await db.collection(CATEGORIES_COLLECTION).insertOne(rest);

    await db.collection(STORE_COLLECTION).updateOne(
      { _id: new ObjectId(storeId) },
      {
        // @ts-ignore
        $push: {
          categories: {
            _id: response.insertedId.toString(),
            categoryName: rest.templateName,
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

export async function PUT(request: Request) {
  const payload: CategoryCollection & { _storeId: string } =
    await request.json();
  const { _id, _storeId, ...rest } = payload;
  let { db } = await connectToDatabase();
  const response = await db
    .collection(CATEGORIES_COLLECTION)
    .updateOne({ _id: new ObjectId(_id) }, { $set: rest });
  await db.collection(STORE_COLLECTION).updateOne(
    { _id: new ObjectId(_storeId), 'categories._id': _id },
    {
      $set: { 'categories.$.categoryName': payload.templateName },
    }
  );
  return Response.json(response, { status: 200 });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const _id = searchParams.get('_id')?.toString();
  const _storeId = searchParams.get('_storeId')?.toString();

  let { db } = await connectToDatabase();
  const response = await db
    .collection(CATEGORIES_COLLECTION)
    .findOneAndDelete({ _id: new ObjectId(_id) });

  await db.collection(STORE_COLLECTION).updateOne(
    { _id: new ObjectId(_storeId) },
    // @ts-ignore
    { $pull: { categories: { _id: _id } } }
  );
  return Response.json(response, { status: 200 });
}
