import { VIDEO_JOBS_COLLECTION } from '@/constant/collections';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { getServerSession } from 'next-auth';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const websiteId = searchParams.get('websiteId');

  try {
    const { db } = await connectToDatabase();

    const query: any = {};
    if (status) query.status = status;
    if (websiteId) query.websiteId = websiteId;

    const jobs = await db
      .collection(VIDEO_JOBS_COLLECTION)
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    const formatted = jobs.map((job: any) => ({
      ...job,
      _id: job._id.toString(),
    }));

    return Response.json({ jobs: formatted });
  } catch (error: any) {
    console.error('[VIDEO JOBS]', error?.message);
    return Response.json(
      { error: error?.message || 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}
