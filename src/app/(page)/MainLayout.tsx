'use client';
import { LogoutOutlined } from '@ant-design/icons';
import { Button, Divider, Flex, Menu, Typography } from 'antd';
import moment from 'moment';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PropsWithChildren } from 'react';
const { Title, Text } = Typography;

export default function MainLayout({ children }: PropsWithChildren) {
  const items = [
    {
      label: (
        <Link href='/home'>
          <Title level={5}>Home</Title>
        </Link>
      ),
      key: '/home',
    },
    {
      label: (
        <Link href='/woo'>
          <Title level={5}>Woo tool</Title>
        </Link>
      ),
      key: '/woo',
      children: [
        {
          label: <Link href='/woo/config-categories'>Config Categories</Link>,
          key: '/woo/config-categories',
        },
        {
          label: <Link href='/woo/config-watermark'>Config Watermark</Link>,
          key: '/woo/config-watermark',
        },
      ],
    },
  ];

  const pathName = usePathname();
  return (
    <Flex
      style={{ padding: '0 20px', minHeight: '100vh' }}
      vertical
      justify='space-between'
    >
      <div>
        <Flex
          justify='space-between'
          style={{ marginBottom: 24 }}
          align='center'
        >
          <Menu
            style={{ minWidth: 0, flex: 'auto' }}
            mode='horizontal'
            selectedKeys={[pathName]}
            items={items}
            triggerSubMenuAction='hover'
          />
          <Button onClick={() => signOut()}>
            <LogoutOutlined />
          </Button>
        </Flex>
        {children}
      </div>
      <div>
        <Divider />
        <Text type='secondary'>
          Copyright by deveric {moment().format('YYYY')}
        </Text>
      </div>
    </Flex>
  );
}
