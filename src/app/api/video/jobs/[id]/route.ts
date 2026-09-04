import { VIDEO_JOBS_COLLECTION } from '@/constant/collections';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { getServerSession } from 'next-auth';
import { rmSync } from 'fs';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { db } = await connectToDatabase();
    const job = await db
      .collection(VIDEO_JOBS_COLLECTION)
      .findOne({ _id: new ObjectId(params.id) });

    if (!job) {
      return Response.json({ error: 'Job not found' }, { status: 404 });
    }

    return Response.json({
      ...job,
      _id: job._id.toString(),
    });
  } catch (error: any) {
    console.error('[VIDEO JOB]', error?.message);
    return Response.json(
      { error: error?.message || 'Failed to fetch job' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { db } = await connectToDatabase();
    const job = await db
      .collection(VIDEO_JOBS_COLLECTION)
      .findOne({ _id: new ObjectId(params.id) });

    if (!job) {
      return Response.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.outputPath) {
      try {
        rmSync(job.outputPath, { force: true });
      } catch {}
    }

    await db
      .collection(VIDEO_JOBS_COLLECTION)
      .deleteOne({ _id: new ObjectId(params.id) });

    return Response.json({ success: true });
  } catch (error: any) {
    console.error('[VIDEO JOB DELETE]', error?.message);
    return Response.json(
      { error: error?.message || 'Failed to delete job' },
      { status: 500 }
    );
  }
}
