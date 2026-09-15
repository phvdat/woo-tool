import { SelectorFormValues } from '@/components/crawl-tool/SelectorSetup';
import { SELECTOR_COLLECTION } from '@/constant/collections';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';


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
      .insertOne(payload as any);
    return Response.json(response, { status: 200 });
  } catch (error: any) {
    console.error(`[SELECTOR] ${error?.message || 'Insert failed'}`);
    return Response.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const _id = searchParams.get('_id') || '';

    let { db } = await connectToDatabase();
    const response = await db
      .collection(SELECTOR_COLLECTION)
      .findOneAndDelete({ _id: new ObjectId(_id) });
    return Response.json(response, { status: 200 });
  } catch (error: any) {
    console.error(`[SELECTOR] ${error?.message || 'Delete failed'}`);
    return Response.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
