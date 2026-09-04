import { WEBSITES_COLLECTION } from '@/constant/collections';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { getServerSession } from 'next-auth';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import path from 'path';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const websiteId = formData.get('websiteId') as string;
    const file = formData.get('file') as File;

    if (!websiteId || !file) {
      return Response.json(
        { error: 'websiteId and file are required' },
        { status: 400 }
      );
    }

    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg'];
    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.mp3')) {
      return Response.json(
        { error: 'Only MP3 files are allowed' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const website = await db
      .collection(WEBSITES_COLLECTION)
      .findOne({ _id: new ObjectId(websiteId) });

    if (!website) {
      return Response.json({ error: 'Website not found' }, { status: 404 });
    }

    const musicDir = path.join('/var/www/html/uploads/music', websiteId);
    mkdirSync(musicDir, { recursive: true });

    const existingMusic = website.backgroundMusicUrl;
    if (existingMusic) {
      const existingPath = existingMusic.replace(
        `${process.env.NEXTAUTH_URL}/uploads/`,
        '/var/www/html/uploads/'
      );
      try {
        rmSync(existingPath, { force: true });
      } catch {}
    }

    const filePath = path.join(musicDir, 'bg.mp3');
    const buffer = Buffer.from(await file.arrayBuffer());
    writeFileSync(filePath, buffer);

    const musicUrl = `${process.env.NEXTAUTH_URL}/uploads/music/${websiteId}/bg.mp3`;

    await db
      .collection(WEBSITES_COLLECTION)
      .updateOne(
        { _id: new ObjectId(websiteId) },
        { $set: { backgroundMusicUrl: musicUrl } }
      );

    return Response.json({ url: musicUrl });
  } catch (error: any) {
    console.error('[UPLOAD MUSIC]', error?.message);
    return Response.json(
      { error: error?.message || 'Failed to upload music' },
      { status: 500 }
    );
  }
}
