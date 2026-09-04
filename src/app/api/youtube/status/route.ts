import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getChannelBySiteId, getOauthConfig } from '@/services/youtube/youtubeService';

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
    const [channel, oauthConfig] = await Promise.all([
      getChannelBySiteId(siteId),
      getOauthConfig(siteId),
    ]);

    if (!channel || !channel.refreshTokenEncrypted) {
      return Response.json({
        connected: false,
        hasOauthConfig: oauthConfig.configured,
      });
    }

    return Response.json({
      connected: true,
      channelTitle: channel.channelTitle,
      channelId: channel.channelId,
      connectedByEmail: channel.connectedByEmail,
      updatedAt: channel.updatedAt,
      hasOauthConfig: oauthConfig.configured,
    });
  } catch (error: any) {
    console.error('[YOUTUBE STATUS]', error?.message);
    return Response.json(
      { error: error?.message || 'Failed to check YouTube status' },
      { status: 500 }
    );
  }
}
