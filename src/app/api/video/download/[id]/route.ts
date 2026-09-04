import { VIDEO_JOBS_COLLECTION } from '@/constant/collections';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { getServerSession } from 'next-auth';
import { readFileSync, existsSync } from 'fs';

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

    if (job.status !== 'completed' || !job.outputPath) {
      return Response.json(
        { error: 'Video is not ready for download' },
        { status: 400 }
      );
    }

    if (!existsSync(job.outputPath)) {
      return Response.json(
        { error: 'Video file not found on disk' },
        { status: 404 }
      );
    }

    const fileName = `Product ${job.productName}.mp4`;

    const headers = new Headers();
    headers.set('Content-Type', 'video/mp4');
    headers.set('Content-Disposition', `attachment; filename="${fileName}"`);

    const fileBuffer = readFileSync(job.outputPath);

    return new Response(fileBuffer, { headers });
  } catch (error: any) {
    console.error('[VIDEO DOWNLOAD]', error?.message);
    return Response.json(
      { error: error?.message || 'Failed to download video' },
      { status: 500 }
    );
  }
}
