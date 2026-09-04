import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { exchangeCode, getChannelInfo, upsertChannel, getChannelBySiteId } from '@/services/youtube/youtubeService';
import { encrypt } from '@/lib/encryption';

function htmlResponse(html: string): Response {
  return new Response(html, {
    headers: { 'Content-Type': 'text/html' },
  });
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return htmlResponse('<html><body><p>Unauthorized</p></body></html>');
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const stateParam = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    return htmlResponse(`
      <html><body><script>window.close();</script></body></html>
    `);
  }

  if (!code || !stateParam) {
    return htmlResponse('<html><body><p>Missing code or state parameter</p></body></html>');
  }

  try {
    const state = JSON.parse(Buffer.from(stateParam, 'base64').toString());
    const { siteId, email } = state;

    if (!siteId || !email) {
      return htmlResponse('<html><body><p>Invalid state parameter</p></body></html>');
    }

    const tokens = await exchangeCode(code, siteId);
    if (!tokens.refresh_token) {
      const existingChannel = await getChannelBySiteId(siteId);
      if (existingChannel?.refreshTokenEncrypted) {
        return htmlResponse(`
          <html><body><script>window.close();</script></body></html>
        `);
      }
      return htmlResponse(
        '<html><body><p>No refresh token received. Please disconnect and reconnect the channel.</p></body></html>'
      );
    }

    const channelInfo = await getChannelInfo(
      tokens.access_token!,
      tokens.refresh_token,
      siteId
    );

    const refreshTokenEncrypted = encrypt(tokens.refresh_token);

    await upsertChannel({
      siteId,
      channelId: channelInfo.channelId,
      channelTitle: channelInfo.channelTitle,
      refreshTokenEncrypted,
      connectedByEmail: email,
    });

    const safeTitle = channelInfo.channelTitle.replace(/'/g, "\\'");
    return htmlResponse(`
      <html><body>
        <script>
          window.opener?.postMessage({ type: 'youtube-connected', channelTitle: '${safeTitle}' }, '*');
          window.close();
        </script>
        <p>Connected! Channel: ${channelInfo.channelTitle}. You can close this window.</p>
      </body></html>
    `);
  } catch (err: any) {
    console.error('[YOUTUBE CALLBACK]', err?.message);
    const safeError = (err?.message || 'Unknown error').replace(/'/g, "\\'");
    return htmlResponse(`
      <html><body>
        <script>
          window.opener?.postMessage({ type: 'youtube-error', error: '${safeError}' }, '*');
          window.close();
        </script>
        <p>Error: ${err?.message || 'Unknown error'}. You can close this window.</p>
      </body></html>
    `);
  }
}
