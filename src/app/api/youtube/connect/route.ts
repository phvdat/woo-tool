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
  const projectId = searchParams.get('projectId') || undefined;
  if (!siteId) {
    return Response.json({ error: 'siteId is required' }, { status: 400 });
  }

  const config = await getOauthConfig(siteId);
  const project = projectId
    ? config.projects.find((item) => item.projectId === projectId)
    : config.projects.find((item) => item.configured);

  if (!project?.configured || !project.clientId) {
    return Response.json(
      { error: 'YouTube OAuth credentials not configured for this project. Please save Client ID and Client Secret first.' },
      { status: 400 }
    );
  }

  const state = Buffer.from(
    JSON.stringify({ siteId, email: session.user.email, projectId: project.projectId })
  ).toString('base64');

  const authUrl = getAuthUrl(state, project.clientId);

  return Response.redirect(authUrl);
}
