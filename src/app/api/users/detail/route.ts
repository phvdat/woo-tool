import { UsersPayload } from '@/app/hooks/useUsers';
import { USERS_COLLECTION } from '@/constant/commons';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');

  let { db } = await connectToDatabase();
  const response = await db.collection(USERS_COLLECTION).findOne({ email });
  return Response.json(response, { status: 200 });
}

export async function PUT(request: Request) {
  try {
    const payload: UsersPayload = await request.json();
    const { email, ...rest } = payload;
    let { db } = await connectToDatabase();
    // update user by email
    const response = await db
      .collection(USERS_COLLECTION)
      .updateOne({ email }, { $set: rest });
    return Response.json(response, { status: 200 });
  } catch (error) {
    console.log(error);

    return Response.json(error, { status: 500 });
  }
}
