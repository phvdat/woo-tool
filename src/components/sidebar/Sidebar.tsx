"use client";

import { navigation } from "@/constant/navigation";
import {
  BarChartOutlined,
  CloudDownloadOutlined,
  FileExcelOutlined,
  FormatPainterOutlined,
  HomeOutlined,
  LogoutOutlined,
  PlayCircleOutlined,
  SettingOutlined,
  ShoppingOutlined,
  TeamOutlined,
  ToolOutlined,
  VideoCameraOutlined,
} from "@ant-design/icons";
import { Avatar, Drawer, Dropdown, Menu, MenuProps, Typography } from "antd";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const { Text } = Typography;

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  isMobile: boolean;
}

const Sidebar = ({ open, onClose, isMobile }: SidebarProps) => {
  const { data } = useSession();
  const email = data?.user?.email;
  const isAdmin = email === process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  const pathname = usePathname();

  const menuItems: MenuProps["items"] = [
    {
      key: "tools",
      label: <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Tools</Text>,
      type: "group",
      children: [
        {
          key: navigation.crawlTool,
          icon: <CloudDownloadOutlined />,
          label: <Link href={navigation.crawlTool} onClick={onClose}>Crawl Tool</Link>,
        },
        {
          key: navigation.convertFile,
          icon: <ToolOutlined />,
          label: <Link href={navigation.convertFile} onClick={onClose}>Convert File</Link>,
        },
        {
          key: navigation.productPipeline,
          icon: <ShoppingOutlined />,
          label: <Link href={navigation.productPipeline} onClick={onClose}>Product Pipeline</Link>,
        },
        {
          key: navigation.excelSplitter,
          icon: <FileExcelOutlined />,
          label: <Link href={navigation.excelSplitter} onClick={onClose}>Excel Splitter</Link>,
        },
        {
          key: navigation.originalProduct,
          icon: <HomeOutlined />,
          label: <Link href={navigation.originalProduct} onClick={onClose}>Original Product</Link>,
        },
        {
          key: navigation.formatImage,
          icon: <FormatPainterOutlined />,
          label: <Link href={navigation.formatImage} onClick={onClose}>Format Image</Link>,
        },
      ],
    },
    {
      key: "media",
      label: <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Media</Text>,
      type: "group",
      children: [
        {
          key: navigation.videoGenerator,
          icon: <PlayCircleOutlined />,
          label: <Link href={navigation.videoGenerator} onClick={onClose}>Video Generator</Link>,
        },
      ],
    },
    {
      key: "analytics",
      label: <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Analytics</Text>,
      type: "group",
      children: [
        {
          key: navigation.revenue,
          icon: <BarChartOutlined />,
          label: <Link href={navigation.revenue} onClick={onClose}>Revenue</Link>,
        },
      ],
    },
    {
      type: "divider",
    },
    {
      key: "settings",
      label: <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Settings</Text>,
      type: "group",
      children: [
        {
          key: navigation.settings,
          icon: <SettingOutlined />,
          label: <Link href={navigation.settings} onClick={onClose}>Profile</Link>,
        },
        {
          key: navigation.configWebsite,
          icon: <SettingOutlined />,
          label: <Link href={navigation.configWebsite} onClick={onClose}>Config Website</Link>,
        },
        {
          key: navigation.configCategories,
          icon: <SettingOutlined />,
          label: <Link href={navigation.configCategories} onClick={onClose}>Config Categories</Link>,
        },
        ...(isAdmin
          ? [
              {
                key: navigation.managementUser,
                icon: <TeamOutlined />,
                label: <Link href={navigation.managementUser} onClick={onClose}>Users</Link>,
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
          <Text type="secondary" style={{ fontSize: 12 }}>{email}</Text>
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
      if (item && "key" in item && item.key && path.startsWith(String(item.key))) {
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
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
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
      </div>

      <Menu
        mode="inline"
        selectedKeys={[selectedKey]}
        items={menuItems}
        style={{ borderRight: "none", padding: "8px 0", flex: 1, overflow: "auto" }}
      />

      <div
        style={{
          padding: "12px",
          borderTop: "1px solid #F3F4F6",
          flexShrink: 0,
        }}
      >
        <Dropdown
          menu={{ items: userMenuItems }}
          trigger={["click"]}
          placement="topRight"
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
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
                style={{ fontSize: 11, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block" }}
              >
                {email}
              </Text>
            </div>
          </div>
        </Dropdown>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer
        placement="left"
        onClose={onClose}
        open={open}
        width={260}
        styles={{ body: { padding: 0, height: "100%" }, header: { display: "none" } }}
      >
        {sidebarContent}
      </Drawer>
    );
  }

  return (
    <div
      style={{
        width: open ? 240 : 72,
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
