import { UserCollection } from '@/app/hooks/user/useUserList';
import { USER_COLLECTION } from '@/constant/commons';
import { connectToDatabase } from '@/lib/mongodb';

export async function PUT(request: Request) {
  try {
    const payload: UserCollection = await request.json();
    const { email, settings } = payload;
    let { db } = await connectToDatabase();
    // update user by email
    const response = await db
      .collection(USER_COLLECTION)
      .updateOne({ email }, { $set: { settings: settings } });
    return Response.json(response, { status: 200 });
  } catch (error) {
    console.log(error);

    return Response.json(error, { status: 500 });
  }
}
