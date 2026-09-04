import { AUDIO_FILES_COLLECTION } from '@/constant/collections';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { AudioFile } from '@/types/video';
import { VIDEO_PATHS } from '@/services/video/config';
import { getServerSession } from 'next-auth';
import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { db } = await connectToDatabase();
    const audioFiles = await db
      .collection(AUDIO_FILES_COLLECTION)
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return Response.json({ audioFiles });
  } catch (error: any) {
    console.error('[AUDIO LIST]', error?.message);
    return Response.json(
      { error: error?.message || 'Failed to list audio files' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return Response.json({ error: 'file is required' }, { status: 400 });
    }

    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/x-wav'];
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|ogg)$/i)) {
      return Response.json(
        { error: 'Only MP3, WAV, OGG files are allowed' },
        { status: 400 }
      );
    }

    const globalMusicDir = VIDEO_PATHS.MUSIC_GLOBAL_BASE;
    mkdirSync(globalMusicDir, { recursive: true });

    const ext = path.extname(file.name) || '.mp3';
    const filename = `${randomUUID()}${ext}`;
    const filePath = path.join(globalMusicDir, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    writeFileSync(filePath, buffer);

    const audioUrl = `${process.env.NEXTAUTH_URL}/uploads/music/global/${filename}`;

    const audioFile: Omit<AudioFile, '_id'> = {
      filename,
      originalName: file.name,
      url: audioUrl,
      size: buffer.length,
      createdAt: new Date(),
    };

    const { db } = await connectToDatabase();
    const result = await db
      .collection(AUDIO_FILES_COLLECTION)
      .insertOne(audioFile as any);

    return Response.json({
      audioFile: { ...audioFile, _id: result.insertedId.toString() },
    });
  } catch (error: any) {
    console.error('[AUDIO UPLOAD]', error?.message);
    return Response.json(
      { error: error?.message || 'Failed to upload audio' },
      { status: 500 }
    );
  }
}
