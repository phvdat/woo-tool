"use client";

import { navigation } from "@/constant/navigation";
import {
  BarChartOutlined,
  CloudDownloadOutlined,
  EyeOutlined,
  FileExcelOutlined,
  FolderOutlined,
  FormatPainterOutlined,
  GlobalOutlined,
  HomeOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  PlayCircleOutlined,
  SettingOutlined,
  ShoppingOutlined,
  TeamOutlined,
  ToolOutlined,
} from "@ant-design/icons";
import {
  Avatar,
  Button,
  Drawer,
  Dropdown,
  Grid,
  Menu,
  MenuProps,
  Typography,
} from "antd";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const { Text } = Typography;
const { useBreakpoint } = Grid;

const Sidebar = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const { data } = useSession();
  const [collapsed, setCollapsed] = useState(true);
  const email = data?.user?.email;
  const isAdmin = email === process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const menuItems: MenuProps["items"] = [
    {
      key: "tools",
      label: (
        <Text
          type="secondary"
          style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          Tools
        </Text>
      ),
      type: "group",
      children: [
        {
          key: navigation.crawlTool,
          icon: <CloudDownloadOutlined />,
          label: (
            <Link
              href={navigation.crawlTool}
              onClick={() => setSidebarOpen(false)}
            >
              Crawl Tool
            </Link>
          ),
        },
        {
          key: navigation.convertFile,
          icon: <ToolOutlined />,
          label: (
            <Link
              href={navigation.convertFile}
              onClick={() => setSidebarOpen(false)}
            >
              Convert File
            </Link>
          ),
        },
        {
          key: navigation.productPipeline,
          icon: <ShoppingOutlined />,
          label: (
            <Link
              href={navigation.productPipeline}
              onClick={() => setSidebarOpen(false)}
            >
              Product Pipeline
            </Link>
          ),
        },
        {
          key: navigation.excelSplitter,
          icon: <FileExcelOutlined />,
          label: (
            <Link
              href={navigation.excelSplitter}
              onClick={() => setSidebarOpen(false)}
            >
              Excel Splitter
            </Link>
          ),
        },
        {
          key: navigation.originalProduct,
          icon: <HomeOutlined />,
          label: (
            <Link
              href={navigation.originalProduct}
              onClick={() => setSidebarOpen(false)}
            >
              Original Product
            </Link>
          ),
        },
        {
          key: navigation.formatImage,
          icon: <FormatPainterOutlined />,
          label: (
            <Link
              href={navigation.formatImage}
              onClick={() => setSidebarOpen(false)}
            >
              Format Image
            </Link>
          ),
        },
        {
          key: navigation.productSpy,
          icon: <EyeOutlined />,
          label: (
            <Link
              href={navigation.productSpy}
              onClick={() => setSidebarOpen(false)}
            >
              Product Spy
            </Link>
          ),
        },
      ],
    },
    {
      key: "media",
      label: (
        <Text
          type="secondary"
          style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          Media
        </Text>
      ),
      type: "group",
      children: [
        {
          key: navigation.videoGenerator,
          icon: <PlayCircleOutlined />,
          label: (
            <Link
              href={navigation.videoGenerator}
              onClick={() => setSidebarOpen(false)}
            >
              Video Generator
            </Link>
          ),
        },
      ],
    },
    {
      key: "analytics",
      label: (
        <Text
          type="secondary"
          style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          Analytics
        </Text>
      ),
      type: "group",
      children: [
        {
          key: navigation.revenue,
          icon: <BarChartOutlined />,
          label: (
            <Link
              href={navigation.revenue}
              onClick={() => setSidebarOpen(false)}
            >
              Revenue
            </Link>
          ),
        },
      ],
    },
    {
      type: "divider",
    },
    {
      key: "settings",
      label: (
        <Text
          type="secondary"
          style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          Settings
        </Text>
      ),
      type: "group",
      children: [
        {
          key: navigation.settings,
          icon: <SettingOutlined />,
          label: (
            <Link
              href={navigation.settings}
              onClick={() => setSidebarOpen(false)}
            >
              Profile
            </Link>
          ),
        },
        {
          key: navigation.configWebsite,
          icon: <GlobalOutlined />,
          label: (
            <Link
              href={navigation.configWebsite}
              onClick={() => setSidebarOpen(false)}
            >
              Config Website
            </Link>
          ),
        },
        {
          key: navigation.configCategories,
          icon: <FolderOutlined />,
          label: (
            <Link
              href={navigation.configCategories}
              onClick={() => setSidebarOpen(false)}
            >
              Config Categories
            </Link>
          ),
        },
        ...(isAdmin
          ? [
              {
                key: navigation.managementUser,
                icon: <TeamOutlined />,
                label: (
                  <Link
                    href={navigation.managementUser}
                    onClick={() => setSidebarOpen(false)}
                  >
                    Users
                  </Link>
                ),
              },
            ]
          : []),
      ],
    },
  ];

  const userMenuItems: MenuProps["items"] = [
    {
      key: "profile",
      label: (
        <div style={{ padding: "4px 0" }}>
          <div style={{ fontWeight: 500 }}>{data?.user?.name || "User"}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {email}
          </Text>
        </div>
      ),
      disabled: true,
    },
    { type: "divider" },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Sign out",
      onClick: () => signOut({ callbackUrl: "/login" }),
    },
  ];

  const findSelectedKey = (items: MenuProps["items"], path: string): string => {
    for (const item of items || []) {
      if (
        item &&
        "key" in item &&
        item.key &&
        path.startsWith(String(item.key))
      ) {
        return String(item.key);
      }
      if (item && "children" in item && item.children) {
        const found = findSelectedKey(item.children, path);
        if (found) return found;
      }
    }
    return "";
  };

  const selectedKey = findSelectedKey(menuItems, pathname);

  const sidebarContent = (
    <div style={{ width: 256 }}>
      <div
        style={{
          height: 64,
          display: "flex",
          alignItems: "center",
          padding: "0 20px",
          borderBottom: "1px solid #F3F4F6",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: "linear-gradient(135deg, #4F46E5, #7C3AED)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontSize: 18,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          W
        </div>
        {isMobile && (
          <span
            style={{
              marginLeft: 12,
              fontSize: 18,
              fontWeight: 700,
              color: "#111827",
              whiteSpace: "nowrap",
            }}
          >
            WooTool
          </span>
        )}
      </div>

      <Menu
        mode="inline"
        selectedKeys={[selectedKey]}
        items={menuItems}
        inlineCollapsed={!isMobile}
        style={{
          borderRight: "none",
          padding: "8px 0",
          flex: 1,
          overflow: "auto",
          maxHeight: "calc(100vh - 136px)",
        }}
      />

      <div
        style={{
          padding: "12px",
          borderTop: "1px solid #F3F4F6",
          flexShrink: 0,
          width: isMobile ? "100%" : "82px",
        }}
      >
        <Dropdown
          menu={{ items: userMenuItems }}
          trigger={["click"]}
          placement="topRight"
          overlayStyle={{ minWidth: "1px" }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              padding: "8px",
              borderRadius: 8,
              cursor: "pointer",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#F3F4F6";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            <Avatar
              src={data?.user?.image}
              size={32}
              style={{ flexShrink: 0 }}
            />
            {isMobile && (
              <div style={{ overflow: "hidden" }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: "#111827",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {data?.user?.name || "User"}
                </div>
                <Text
                  type="secondary"
                  style={{
                    fontSize: 11,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "block",
                  }}
                >
                  {email}
                </Text>
              </div>
            )}
          </div>
        </Dropdown>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <div>
        <div
          style={{
            height: 56,
            display: "flex",
            alignItems: "center",
            padding: "0 16px",
            background: "#ffffff",
            borderBottom: "1px solid #F3F4F6",
            position: "sticky",
            top: 0,
            zIndex: 50,
          }}
        >
          <Button
            type="text"
            icon={sidebarOpen ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{ fontSize: 16, width: 40, height: 40 }}
          />
        </div>
        <Drawer
          placement="left"
          onClose={() => setSidebarOpen(false)}
          open={sidebarOpen}
          width={260}
          styles={{
            body: { padding: 0, height: "100%" },
            header: { display: "none" },
          }}
        >
          {sidebarContent}
        </Drawer>
      </div>
    );
  }

  return (
    <div
      style={{
        width: collapsed ? 88 : 256,
        transition: "width 0.25s ease",
        height: "100vh",
        position: "fixed",
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 100,
        background: "#ffffff",
        borderRight: "1px solid #F3F4F6",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {sidebarContent}
    </div>
  );
};

export default Sidebar;
