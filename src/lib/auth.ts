import { NextAuthOptions } from 'next-auth';
import Google from 'next-auth/providers/google';
import { connectToDatabase } from './mongodb';
import _get from 'lodash/get';
import { USER_COLLECTION } from '@/constant/commons';

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      try {
        let { db } = await connectToDatabase();
        const response = await db.collection(USER_COLLECTION).find().toArray();
        const listEmail = response.map((item) => item.email);
        const isHadAdmin = listEmail.includes(
          process.env.NEXT_PUBLIC_ADMIN_EMAIL
        );
        if (!isHadAdmin) {
          await db.collection(USER_COLLECTION).insertOne({
            email: process.env.NEXT_PUBLIC_ADMIN_EMAIL,
          });
          listEmail.push(process.env.NEXT_PUBLIC_ADMIN_EMAIL);
        }
        if (
          account?.provider === 'google' &&
          _get(profile, 'email_verified') &&
          listEmail.includes(_get(profile, 'email', ''))
        ) {
          return true;
        } else {
          return false;
        }
      } catch (error) {
        console.log('get user list', error);
        return false;
      }
    },
    redirect({ url, baseUrl }) {
      return url.startsWith(baseUrl) ? url : baseUrl;
    },
  },
};
