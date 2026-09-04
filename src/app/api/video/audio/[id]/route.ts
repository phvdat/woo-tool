import { AUDIO_FILES_COLLECTION } from '@/constant/collections';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { VIDEO_PATHS } from '@/services/video/config';
import { getServerSession } from 'next-auth';
import { ObjectId } from 'mongodb';
import { rmSync } from 'fs';
import path from 'path';

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = params;
    const { db } = await connectToDatabase();

    const audioFile = await db
      .collection(AUDIO_FILES_COLLECTION)
      .findOne({ _id: new ObjectId(id) });

    if (!audioFile) {
      return Response.json({ error: 'Audio file not found' }, { status: 404 });
    }

    const filePath = path.join(VIDEO_PATHS.MUSIC_GLOBAL_BASE, audioFile.filename);
    try {
      rmSync(filePath, { force: true });
    } catch {}

    await db
      .collection(AUDIO_FILES_COLLECTION)
      .deleteOne({ _id: new ObjectId(id) });

    return Response.json({ success: true });
  } catch (error: any) {
    console.error('[AUDIO DELETE]', error?.message);
    return Response.json(
      { error: error?.message || 'Failed to delete audio' },
      { status: 500 }
    );
  }
}
