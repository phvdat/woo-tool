import Setting from './Setting';
import { authOptions } from '@/lib/auth';
import { getServerSession } from 'next-auth';

async function SettingPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  const isAdmin = email === process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  return <Setting isAdmin={isAdmin} />;
}

export default SettingPage;
