export { default } from 'next-auth/middleware';

export const config = {
  matcher: ['/((?!uploads|_next|favicon.ico|api/youtube/callback).*)'],
};
