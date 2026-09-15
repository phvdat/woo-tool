import { CategoryFormValue } from '@/components/settings/UpdateCategoryModal';
import { CATEGORIES_COLLECTION } from '@/constant/collections';
import { connectToDatabase } from '@/lib/mongodb';


export interface WooCategoryPayload extends CategoryFormValue {
  _id?: string;
}

export async function POST(request: Request) {
  try {
    const payload: WooCategoryPayload[] = await request.json();
    const sanitizedPayload = payload.map(({ _id, ...rest }) => rest);
    let { db } = await connectToDatabase();

    const response = await db
      .collection(CATEGORIES_COLLECTION)
      .insertMany(sanitizedPayload);

    return Response.json(response, { status: 200 });
  } catch (error) {
    console.error(`[CATEGORIES BULK] ${error instanceof Error ? error.message : 'InsertMany failed'}`);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
