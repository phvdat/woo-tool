import { authOptions } from '@/lib/auth';
import { Button, Flex } from 'antd';
import { getServerSession } from 'next-auth';
import Home from './Home';

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  return (
    <Flex vertical justify='space-between'>
      <Home />
      {email === process.env.NEXT_PUBLIC_ADMIN_EMAIL ? (
        <Button href='/management-users' style={{ marginTop: 24 }}>
          Management Users
        </Button>
      ) : null}
    </Flex>
  );
}
