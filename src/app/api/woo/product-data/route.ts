import { Product } from '@/app/(page)/convert-file/ConvertFile';
import { connectToDatabase } from '@/lib/mongodb';

const PRODUCT_DATA_COLLECTION = 'product-data';

export interface ProductDataPayload extends Product { }

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const email = searchParams.get('email') || '';
  const categories = searchParams.get('categories') || '';
  const name = searchParams.get('name') || '';
  let { db } = await connectToDatabase();
  const filter: any = {
    email,
  };
  if (categories) {
    filter.Categories = {
      $regex: categories,
      $options: 'i',
    };
  }
  if (name) {
    filter.Name = {
      $regex: name,
      $options: 'i',
    };
  }
  const response = await db
    .collection(PRODUCT_DATA_COLLECTION)
    .find(filter)
    .sort({ createdAt: -1 })
    .toArray();
  return Response.json(response, { status: 200 });
}

export async function POST(request: Request) {
  try {
    const payload: ProductDataPayload[] = await request.json();
    let { db } = await connectToDatabase();
    const response = await db
      .collection(PRODUCT_DATA_COLLECTION)
      .insertMany(payload);
    return Response.json(response, { status: 200 });
  } catch (error) {
    console.log(error);

    return Response.json(error, { status: 500 });
  }
}
