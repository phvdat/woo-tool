import { Product } from '@/app/(page)/convert-file/ConvertFile';
import { SelectorFormValues } from '@/components/crawl-tool/SelectorSetup';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

const SELECTOR_COLLECTION = 'selector-webs';

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const domain = searchParams.get('domain') || '';
  let { db } = await connectToDatabase();
  const response = await db
    .collection(SELECTOR_COLLECTION)
    .find({ domain: { $regex: domain, $options: 'i' } })
    .sort({ createdAt: -1 })
    .toArray();
  return Response.json(response, { status: 200 });
}

export async function POST(request: Request) {
  try {
    const payload: SelectorFormValues = await request.json();
    let { db } = await connectToDatabase();
    const response = await db
      .collection(SELECTOR_COLLECTION)
      .insertOne(payload);
    return Response.json(response, { status: 200 });
  } catch (error) {
    console.log(error);
    return Response.json(error, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const _id = searchParams.get('_id') || '';
    console.log('Deleting selector with ID:', _id);

    let { db } = await connectToDatabase();
    const response = await db
      .collection(SELECTOR_COLLECTION)
      .findOneAndDelete({ _id: new ObjectId(_id) });
    return Response.json(response, { status: 200 });
  } catch (error) {
    console.log(error);
    return Response.json(error, { status: 500 });
  }
}
