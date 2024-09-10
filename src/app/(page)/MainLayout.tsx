'use client';
import Header from '@/components/header/Header';
import { Layout, Typography } from 'antd';
import moment from 'moment';
import { SessionProvider } from 'next-auth/react';
import { PropsWithChildren } from 'react';
const { Text } = Typography;
const { Content, Footer } = Layout;

export default function MainLayout({ children }: PropsWithChildren) {
  return (
    <SessionProvider>
      <Layout style={layoutStyle}>
        <Header />

        <Content style={contentStyle}>{children}</Content>

        <Footer>
          <Text type='secondary'>
            Copyright by deveric {moment().format('YYYY')}
          </Text>
        </Footer>
      </Layout>
    </SessionProvider>
  );
}

const layoutStyle: React.CSSProperties = {
  minHeight: '100vh',
};
const contentStyle: React.CSSProperties = {
  padding: '0 24px',
  background: '#fff',
};
