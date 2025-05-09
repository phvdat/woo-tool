import { AntdRegistry } from '@ant-design/nextjs-registry';
import type { Metadata, Viewport } from 'next';
import './global.css';
export const metadata: Metadata = {
  title: 'Woo!',
  description: 'Generated by deveric2k',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en'>
      <link rel='icon' href='assets/computer.png' />
      <body>
        <AntdRegistry>{children}</AntdRegistry>
      </body>
    </html>
  );
}
