import { VIDEO_JOBS_COLLECTION } from '@/constant/collections';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { getServerSession } from 'next-auth';
import archiver from 'archiver';
import { Readable } from 'stream';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const idsParam = searchParams.get('ids');

  if (!idsParam) {
    return Response.json({ error: 'ids parameter is required' }, { status: 400 });
  }

  const ids = idsParam.split(',').filter(Boolean);

  try {
    const { db } = await connectToDatabase();
    const { ObjectId } = require('mongodb');

    const objectIds = ids.map((id) => new ObjectId(id));
    const jobs = await db
      .collection(VIDEO_JOBS_COLLECTION)
      .find({
        _id: { $in: objectIds },
        status: 'completed',
        outputPath: { $ne: null },
      })
      .toArray();

    if (jobs.length === 0) {
      return Response.json(
        { error: 'No completed videos found' },
        { status: 404 }
      );
    }

    const archive = archiver('zip', { zlib: { level: 1 } });

    archive.on('error', (err) => {
      console.error('[VIDEO DOWNLOAD ALL] archive error:', err);
    });

    for (const job of jobs) {
      if (job.outputPath) {
        const fileName = `Product ${job.productName}.mp4`;
        archive.file(job.outputPath, { name: fileName });
      }
    }

    archive.finalize();

    const headers = new Headers();
    headers.set('Content-Type', 'application/zip');
    headers.set('Content-Disposition', 'attachment; filename="videos.zip"');
    return new Response(Readable.toWeb(archive) as any, { headers });
  } catch (error: any) {
    console.error('[VIDEO DOWNLOAD ALL]', error?.message);
    return Response.json(
      { error: error?.message || 'Failed to create ZIP' },
      { status: 500 }
    );
  }
}
