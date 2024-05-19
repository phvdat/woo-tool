import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import _get from 'lodash/get'

const handler = NextAuth({
  // pages: { signIn: '/login' },
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || ''
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === 'google'
        && _get(profile, 'email_verified')
        && _get(profile, 'email') === process.env.MY_EMAIL) {

        return true
      } else {
        return false
      }
    },
    redirect({ url, baseUrl }) {
      return url.startsWith(baseUrl) ? url : baseUrl
    }
  }
})

export { handler as GET, handler as POST }
