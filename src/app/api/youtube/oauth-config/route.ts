import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { saveOauthConfig, getOauthConfig } from '@/services/youtube/youtubeService';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get('siteId');
  if (!siteId) {
    return Response.json({ error: 'siteId is required' }, { status: 400 });
  }

  try {
    const config = await getOauthConfig(siteId);
    return Response.json(config);
  } catch (error: any) {
    console.error('[YOUTUBE OAUTH CONFIG GET]', error?.message);
    return Response.json(
      { error: error?.message || 'Failed to get OAuth config' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { siteId, clientId, clientSecret } = body;

    if (!siteId || !clientId || !clientSecret) {
      return Response.json(
        { error: 'siteId, clientId, and clientSecret are required' },
        { status: 400 }
      );
    }

    await saveOauthConfig(siteId, clientId, clientSecret, session.user.email);
    return Response.json({ success: true });
  } catch (error: any) {
    console.error('[YOUTUBE OAUTH CONFIG PUT]', error?.message);
    return Response.json(
      { error: error?.message || 'Failed to save OAuth config' },
      { status: 500 }
    );
  }
}
