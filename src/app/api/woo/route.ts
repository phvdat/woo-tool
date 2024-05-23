import { WooFormValue } from "@/components/woo/WooForm";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";


const WOO_COLLECTION = 'woo';

export interface WooFormValuePayload extends WooFormValue {
  _id?: string;
}

export async function GET() {
  let { db } = await connectToDatabase();
  const response = await db.collection(WOO_COLLECTION).find().toArray();
  return Response.json(response, { status: 200 });
}

export async function POST(request: Request) {
  try {
    const payload: WooFormValuePayload = await request.json();
    const { _id, ...rest } = payload;
    let { db } = await connectToDatabase();
    const response = await db.collection(WOO_COLLECTION).insertOne(rest);
    return Response.json(response, { status: 200 });
  } catch (error) {
    console.log(error);

    return Response.json(error, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const payload: WooFormValuePayload = await request.json();
  const { _id, ...rest } = payload;
  let { db } = await connectToDatabase();
  const response = await db
    .collection(WOO_COLLECTION)
    .updateOne({ _id: new ObjectId(_id) }, { $set: rest });
  return Response.json(response, { status: 200 });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const _id = searchParams.get('_id')?.toString();

  let { db } = await connectToDatabase();
  const response = await db
    .collection(WOO_COLLECTION)
    .findOneAndDelete({ _id: new ObjectId(_id) });
  return Response.json(response, { status: 200 });
}