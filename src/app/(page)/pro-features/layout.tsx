import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import ProLayout from './ProLayout';

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  const isProAccount = email === process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  if (!isProAccount) {
    return <div>Unauthorized</div>;
  }
  return <ProLayout>{children}</ProLayout>;
}
