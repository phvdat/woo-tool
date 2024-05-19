'use client';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { Button, Flex, Menu, Typography } from 'antd';
import { signOut } from "next-auth/react"
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PropsWithChildren } from 'react';
const { Title } = Typography;

export default function MainLayout({
  children,
}: PropsWithChildren) {

  const items = [
    {
      label: <Link href='/home'><Title level={5}>Home</Title></Link>,
      key: '/home',
    },
    {
      label: <Link href='/woo'><Title level={5}>Woo tool</Title></Link>,
      key: '/woo',
      children: [
        {
          label: <Link href='/config-categories'>Config Categories</Link>,
          key: '/config-categories',
        },
        {
          label: <Link href='/chat'>Chat GPT</Link>,
          key: '/chat',
        },
      ],
    },
    {
      label: <Link href='/watermark'><Title level={5}>Watermark</Title></Link>,
      key: '/watermark',
    },
  ]

  const pathName = usePathname();
  return (
    <div style={{ padding: '0 20px' }}>
      <Flex justify='space-between' style={{ marginBottom: 24 }} align='center'>
        <Menu style={{ minWidth: 0, flex: "auto" }} mode="horizontal" selectedKeys={[pathName]} items={items} />
        <Button onClick={() => signOut()}>Logout</Button>
      </Flex>
      {children}
    </div>
  );
}
