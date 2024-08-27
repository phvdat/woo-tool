import { UserCollection } from '@/app/hooks/user/useUserList';
import { USER_COLLECTION } from '@/constant/commons';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET(
  request: Request,
  { params }: { params: { email: string } }
) {
  const email = params.email;

  let { db } = await connectToDatabase();
  const response = await db.collection(USER_COLLECTION).findOne({ email });
  return Response.json(response, { status: 200 });
}
