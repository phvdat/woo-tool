'use client';
import Header from '@/components/header/Header';
import ProHeader from '@/components/header/ProHeader';
import { Layout, Typography } from 'antd';
import moment from 'moment';
import { SessionProvider } from 'next-auth/react';
import { PropsWithChildren } from 'react';
const { Text } = Typography;
const { Content, Footer } = Layout;

export default function ProLayout({ children }: PropsWithChildren) {
  return (
    <SessionProvider>
      <Layout style={layoutStyle}>
        <ProHeader />

        <Content style={contentStyle}>{children}</Content>

        <Footer>
          <Text type='secondary'>
            Copyright by Eric Pham {moment().format('YYYY')}
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
