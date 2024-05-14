import { ArrowLeftOutlined } from '@ant-design/icons';
import { Typography } from 'antd';
import Link from 'next/link';
const { Title } = Typography;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div style={{ padding: 20 }}>
      <Link href='/' style={{ color: 'black', textDecoration: 'none' }}>
        <ArrowLeftOutlined /> Back to Home
      </Link>
      {children}
    </div>
  );
}
