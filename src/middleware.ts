export { default } from 'next-auth/middleware';

export const config = {
  matcher: ['/((?!api/auth|login|uploads|_next|favicon.ico|api/youtube/callback).*)'],
};
