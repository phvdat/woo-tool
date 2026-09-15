import { Product } from '@/app/(page)/convert-file/ConvertFile';
import { PRODUCT_DATA_COLLECTION } from '@/constant/collections';
import { connectToDatabase } from '@/lib/mongodb';

export interface ProductDataPayload extends Product { }

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const email = searchParams.get('email') || '';
  const categories = searchParams.get('categories') || '';
  const name = searchParams.get('name') || '';
  const { db } = await connectToDatabase();
  const pipeline: any[] = [];

  if (name.trim()) {
    pipeline.push({
      $search: {
        index: "product",
        text: {
          query: name,
          path: "Name",
          fuzzy: { maxEdits: 2 }
        }
      }
    });
  }

  pipeline.push({
    $match: {
      email,
      ...(categories ? { Categories: categories } : {})
    }
  });

  if (name.trim()) {
    pipeline.push({
      $sort: {
        score: { $meta: "searchScore" }
      }
    });
  }
  const response = await db
    .collection(PRODUCT_DATA_COLLECTION)
    .aggregate(pipeline)
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
  } catch (error: any) {
    console.error(`[PRODUCT DATA] ${error?.message || 'Insert failed'}`);
    return Response.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
