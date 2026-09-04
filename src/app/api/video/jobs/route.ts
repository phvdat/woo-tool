import { VIDEO_JOBS_COLLECTION } from '@/constant/collections';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { getServerSession } from 'next-auth';
import { ObjectId } from 'mongodb';
import { rmSync } from 'fs';

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

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { ids } = body;

    if (!ids?.length) {
      return Response.json({ error: 'ids are required' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const objectIds = ids.map((id: string) => new ObjectId(id));

    const jobs = await db
      .collection(VIDEO_JOBS_COLLECTION)
      .find({ _id: { $in: objectIds } })
      .toArray();

    for (const job of jobs) {
      if (job.outputPath) {
        try {
          rmSync(job.outputPath, { force: true });
        } catch {}
      }
    }

    const result = await db
      .collection(VIDEO_JOBS_COLLECTION)
      .deleteMany({ _id: { $in: objectIds } });

    return Response.json({ deletedCount: result.deletedCount });
  } catch (error: any) {
    console.error('[VIDEO JOBS DELETE]', error?.message);
    return Response.json(
      { error: error?.message || 'Failed to delete jobs' },
      { status: 500 }
    );
  }
}
