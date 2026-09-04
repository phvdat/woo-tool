import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAuthUrl, getOauthConfig } from '@/services/youtube/youtubeService';

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

  const config = await getOauthConfig(siteId);
  if (!config.configured || !config.clientId) {
    return Response.json(
      { error: 'YouTube OAuth credentials not configured for this site. Please save Client ID and Client Secret first.' },
      { status: 400 }
    );
  }

  const state = Buffer.from(
    JSON.stringify({ siteId, email: session.user.email })
  ).toString('base64');

  const authUrl = getAuthUrl(state, config.clientId);

  return Response.redirect(authUrl);
}
