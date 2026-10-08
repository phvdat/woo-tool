import { BACKGROUND_IMAGES_COLLECTION } from '@/constant/collections';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { BackgroundImage } from '@/types/video';
import { VIDEO_PATHS } from '@/services/video/config';
import { getServerSession } from 'next-auth';
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const MAX_BACKGROUND_EDGE = 2160;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { db } = await connectToDatabase();
    const backgroundImages = await db
      .collection(BACKGROUND_IMAGES_COLLECTION)
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return Response.json({ backgroundImages });
  } catch (error: any) {
    console.error('[BACKGROUND LIST]', error?.message);
    return Response.json(
      { error: error?.message || 'Failed to list background images' },
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

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(jpe?g|png|webp)$/i)) {
      return Response.json(
        { error: 'Only JPEG, PNG, WebP images are allowed' },
        { status: 400 }
      );
    }

    const backgroundDir = VIDEO_PATHS.BACKGROUND_BASE;
    mkdirSync(backgroundDir, { recursive: true });

    const ext = path.extname(file.name) || '.jpg';
    const filename = `${randomUUID()}${ext}`;
    const originalBuffer = Buffer.from(await file.arrayBuffer());

    const buffer = await sharp(originalBuffer)
      .resize(MAX_BACKGROUND_EDGE, MAX_BACKGROUND_EDGE, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .toBuffer();

    writeFileSync(path.join(backgroundDir, filename), buffer);

    const imageUrl = `${process.env.NEXTAUTH_URL}/uploads/backgrounds/${filename}`;

    const backgroundImage: Omit<BackgroundImage, '_id'> = {
      filename,
      originalName: file.name,
      url: imageUrl,
      size: buffer.length,
      createdAt: new Date().toISOString(),
    };

    const { db } = await connectToDatabase();
    const result = await db
      .collection(BACKGROUND_IMAGES_COLLECTION)
      .insertOne(backgroundImage as any);

    return Response.json({
      backgroundImage: { ...backgroundImage, _id: result.insertedId.toString() },
    });
  } catch (error: any) {
    console.error('[BACKGROUND UPLOAD]', error?.message);
    return Response.json(
      { error: error?.message || 'Failed to upload background image' },
      { status: 500 }
    );
  }
}
