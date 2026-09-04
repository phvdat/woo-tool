import { WEBSITES_COLLECTION } from '@/constant/collections';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { VideoProduct } from '@/types/video';
import axios from 'axios';
import { getServerSession } from 'next-auth';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const websiteId = searchParams.get('websiteId');
  const page = parseInt(searchParams.get('page') || '1');
  const perPage = parseInt(searchParams.get('per_page') || '10');

  if (!websiteId) {
    return Response.json({ error: 'websiteId is required' }, { status: 400 });
  }

  try {
    const { db } = await connectToDatabase();
    const website = await db
      .collection(WEBSITES_COLLECTION)
      .findOne({ _id: new (require('mongodb')).ObjectId(websiteId) });

    if (!website) {
      return Response.json({ error: 'Website not found' }, { status: 404 });
    }

    const woo = axios.create({
      baseURL: `${website.url}/wp-json/wc/v3`,
      auth: {
        username: website.wpUsername,
        password: website.wpAppPassword,
      },
      timeout: 30_000,
    });

    const { data: products, headers } = await woo.get('/products', {
      params: {
        page,
        per_page: perPage,
        status: 'publish',
        orderby: 'date',
        order: 'desc',
      },
    });

    const totalProducts = parseInt(headers['x-wp-total'] || '0');
    const totalPages = parseInt(headers['x-wp-totalpages'] || '0');

    const formatted: VideoProduct[] = products.map((p: any) => ({
      id: p.id,
      name: p.name,
      images: (p.images || []).map((img: any) => ({
        id: img.id,
        src: img.src,
        name: img.name,
      })),
      status: p.status,
      price: p.price || p.regular_price || '0',
      sku: p.sku || '',
    }));

    return Response.json({
      products: formatted,
      pagination: {
        page,
        perPage,
        totalProducts,
        totalPages,
      },
    });
  } catch (error: any) {
    console.error('[VIDEO PRODUCTS]', error?.message);
    return Response.json(
      { error: error?.message || 'Failed to fetch products' },
      { status: 500 }
    );
  }
}
