import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ConfigProvider } from 'antd';
import theme from '@/theme/themeConfig';

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AntdRegistry>
      <ConfigProvider theme={theme}>
        {children}
      </ConfigProvider>
    </AntdRegistry>
  );
}
