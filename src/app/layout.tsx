import { AntdRegistry } from "@ant-design/nextjs-registry";
import type { Metadata, Viewport } from "next";
import "./global.css";
import { ConfigProvider } from "antd";
import theme from "@/theme/themeConfig";

export const metadata: Metadata = {
  title: "WooTool - WooCommerce Automation",
  description:
    "WooCommerce automation platform for product management, video generation, and more",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <meta name="viewport" content="initial-scale=1, maximum-scale=1" />
      </head>
      <body>
        <AntdRegistry>
          <ConfigProvider theme={theme}>{children}</ConfigProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
