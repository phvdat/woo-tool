"use client";

import Sidebar from "@/components/sidebar/Sidebar";
import { Layout, Grid, Button } from "antd";
import { MenuFoldOutlined, MenuUnfoldOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { SessionProvider } from "next-auth/react";
import { PropsWithChildren, useState } from "react";

const { Content, Footer } = Layout;
const { useBreakpoint } = Grid;

export default function MainLayout({ children }: PropsWithChildren<{}>) {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  return (
    <SessionProvider>
      <Layout style={{ minHeight: "100vh" }}>
        <Sidebar />
        <Layout
          style={{
            marginLeft: isMobile ? 0 : 72,
            transition: "margin-left 0.25s ease",
          }}
        >
          <Content
            style={{
              padding: isMobile ? 12 : 24,
              minHeight: "calc(100vh - 56px - 52px)",
              background: "#F9FAFB",
            }}
          >
            <div style={{ maxWidth: 1200, margin: "0 auto" }}>{children}</div>
          </Content>

          <Footer
            style={{
              textAlign: "center",
              background: "#ffffff",
              borderTop: "1px solid #F3F4F6",
              padding: "12px 24px",
            }}
          >
            WooTool &copy; {dayjs().year()}
          </Footer>
        </Layout>
      </Layout>
    </SessionProvider>
  );
}
