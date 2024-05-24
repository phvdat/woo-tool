import { getServerSession } from 'next-auth';
import ManagementUsers from './ManagementUsers';
import { authOptions } from '@/lib/auth';

async function ManagementUsersPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (email !== process.env.ADMIN_EMAIL) {
    return <div>Unauthorized</div>;
  }

  return <ManagementUsers />;
}

export default ManagementUsersPage;
