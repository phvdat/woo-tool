import Settings from './Settings';
import { authOptions } from '@/lib/auth';
import { getServerSession } from 'next-auth';

async function SettingsPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  const isAdmin = email === process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  return <Settings isAdmin={isAdmin} />;
}

export default SettingsPage;
