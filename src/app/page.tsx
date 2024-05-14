import { Card, Col, Row } from 'antd';
import Link from 'next/link';

const toolPath = [
  {
    label: 'Woo tool',
    path: '/woo',
  },
  {
    label: 'Chat test',
    path: '/chat',
  },
];

export default function Home() {
  return (
    <Row gutter={[16, 24]}>
      {toolPath.map((tool) => (
        <Col span={12} key={tool.path}>
          <Link href={tool.path}>
            <Card>
              <h1>{tool.label}</h1>
            </Card>
          </Link>
        </Col>
      ))}
    </Row>
  );
}
