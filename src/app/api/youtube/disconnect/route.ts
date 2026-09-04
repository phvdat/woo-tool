import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { removeChannel } from '@/services/youtube/youtubeService';

export async function DELETE(request: Request) {
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
    const removed = await removeChannel(siteId);
    return Response.json({ success: removed });
  } catch (error: any) {
    console.error('[YOUTUBE DISCONNECT]', error?.message);
    return Response.json(
      { error: error?.message || 'Failed to disconnect YouTube channel' },
      { status: 500 }
    );
  }
}
