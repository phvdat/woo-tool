import { navigation } from "@/constant/navigation";
import {
  GlobalOutlined,
  LoginOutlined,
  MenuOutlined,
  SettingFilled,
  ShoppingOutlined,
  TeamOutlined
} from "@ant-design/icons";
import {
  Avatar,
  Drawer,
  Dropdown,
  Grid,
  Layout,
  Menu,
  MenuProps,
  Typography,
} from "antd";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const { Header: HeaderAntd } = Layout;
const { Text } = Typography;
const { useBreakpoint } = Grid;

const Header = () => {
  const { data } = useSession();
  const email = data?.user?.email;
  const isAdmin = email === process.env.NEXT_PUBLIC_ADMIN_EMAIL;

  const screens = useBreakpoint();
  const isMobile = !screens.md; // mobile < 768px

  const [drawerVisible, setDrawerVisible] = useState(false);

  const headerItems: MenuProps["items"] = [
    {
      label: (
        <Link href={navigation.createInitialFile}>Create Initial File</Link>
      ),
      key: navigation.createInitialFile,
    },
    {
      label: <Link href={navigation.crawlTool}>Crawl</Link>,
      key: navigation.crawlTool,
    },
    {
      label: <Link href={navigation.convertFile}>Convert File</Link>,
      key: navigation.convertFile,
    },
    {
      label: <Link href={navigation.woo}>Woo tool</Link>,
      key: navigation.woo,
    },
    {
      label: <Link href={navigation.openaiContent}>Openai Content</Link>,
      key: navigation.openaiContent,
    },
    {
      label: (
        <Link href={navigation.updatePublishedTime}>Update Published Time</Link>
      ),
      key: navigation.updatePublishedTime,
    },
    {
      label: <Link href={navigation.excelSplitter}>Excel Splitter</Link>,
      key: navigation.excelSplitter,
    },
    {
      label: <Link href={navigation.originalProduct}>Original Product</Link>,
      key: navigation.originalProduct,
    },
  ];

  const dropdownItems: MenuProps["items"] = [
    {
      key: navigation.setting,
      label: (
        <Link href={navigation.setting}>
          <SettingFilled /> Setting
        </Link>
      ),
    },

    {
      label: <Link href={navigation.configCategories}><ShoppingOutlined /> Config Categories</Link>,
      key: navigation.configCategories,
    },
    {
      label: <Link href={navigation.configWebsite}><GlobalOutlined /> Config Website</Link>,
      key: navigation.configWebsite,
    },
    ...(isAdmin
      ? [
          {
            key: navigation.managementUser,
            label: (
              <Link href={navigation.managementUser}>
                <TeamOutlined /> Management Users
              </Link>
            ),
          },
        ]
      : []),
    {
      key: "logout",
      label: (
        <Text onClick={() => signOut()}>
          <LoginOutlined /> Logout
        </Text>
      ),
    },
  ];

  const pathName = usePathname();

  return (
    <HeaderAntd style={headerStyle}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: "100%",
        }}
      >
        {isMobile ? (
          <>
            <MenuOutlined
              style={{ fontSize: 18 }}
              onClick={() => setDrawerVisible(true)}
            />
            <Drawer
              title="Menu"
              placement="left"
              onClose={() => setDrawerVisible(false)}
              open={drawerVisible}
              width={300}
              styles={{ body: { padding: 0 } }}
            >
              <Menu
                mode="inline"
                selectedKeys={[pathName]}
                items={headerItems}
                onClick={() => setDrawerVisible(false)}
              />
            </Drawer>
          </>
        ) : (
          <Menu
            style={{ flex: 1 }}
            mode="horizontal"
            selectedKeys={[pathName]}
            items={headerItems}
            triggerSubMenuAction="hover"
          />
        )}

        <Dropdown
          menu={{ items: dropdownItems }}
          trigger={["click"]}
          placement="bottomRight"
        >
          <Avatar
            src={data?.user?.image}
            style={{ cursor: "pointer", marginLeft: 16 }}
          />
        </Dropdown>
      </div>
    </HeaderAntd>
  );
};

const headerStyle: React.CSSProperties = {
  background: "#fff",
  minHeight: "64px",
  padding: "0 16px",
};

export default Header;
