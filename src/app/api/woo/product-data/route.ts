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

  const response = await db.collection(PRODUCT_DATA_COLLECTION).aggregate([
    {
      $search: {
        index: "product",
        text: {
          query: name,
          path: "Name",
          fuzzy: { maxEdits: 2 }
        }
      }
    },
    {
      $match: {
        email,
        ...(categories ? { Categories: categories } : {})
      }
    },
    {
      $sort: {
        score: { $meta: "searchScore" }
      }
    }
  ]).toArray();
  console.log(response);
  
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
