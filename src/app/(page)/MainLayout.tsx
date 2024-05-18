'use client';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { Button, Flex, Menu, Typography } from 'antd';
import { signOut } from "next-auth/react"
import { usePathname } from 'next/navigation';
import { PropsWithChildren } from 'react';
const { Title, Link } = Typography;

export default function MainLayout({
  children,
}: PropsWithChildren) {

  const items = [
    {
      label: <Link href='/woo'>Woo tool</Link>,
      key: '/woo',
      children: [
        {
          label: <Link href='/config-categories'>Config Categories</Link>,
          key: '/config-categories',
        },
      ],
    },
    {
      label: <Link href='/watermark'>Watermark</Link>,
      key: '/watermark',
    },
    {
      label: <Link href='/chat'>Chat GPT</Link>,
      key: '/chat',
    },
  ]

  const pathName = usePathname();
  console.log(pathName);
  return (
    <div style={{ padding: 20 }}>
      <Flex justify='space-between' style={{ marginBottom: 24 }}>
        <Link href='/' style={{ color: 'black', textDecoration: 'none' }}>
          <ArrowLeftOutlined /> Back to Home
        </Link>
        <Menu style={{ minWidth: 0, flex: "auto" }} mode="horizontal" activeKey={pathName} items={items} />
        <Button onClick={() => signOut()}>Logout</Button>
      </Flex>
      {children}
    </div>
  );
}
