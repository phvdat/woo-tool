import { authOptions } from '@/lib/auth';
import { Button, Card, Col, Flex, Row } from 'antd';
import { getServerSession } from 'next-auth';
import Link from 'next/link';

const toolPath = [
  {
    label: 'Woo tool',
    path: '/woo',
  },
  {
    label: 'Chat GPT',
    path: '/chat',
  },
  {
    label: 'Watermark',
    path: '/watermark',
  },
];

export default async function Home() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  return (
    <Flex
      vertical
      justify='space-between'
      style={{ minHeight: 'calc(100vh - 100px)' }}
    >
      <Row gutter={[16, 24]}>
        {toolPath.map((tool) => (
          <Col span={24} md={{ span: 12 }} key={tool.path}>
            <Link href={tool.path}>
              <Card>
                <h1>{tool.label}</h1>
              </Card>
            </Link>
          </Col>
        ))}
      </Row>
      {email === process.env.ADMIN_EMAIL ? (
        <Button href='/management-users' style={{ marginTop: 24 }}>
          Management Users
        </Button>
      ) : null}
    </Flex>
  );
}
