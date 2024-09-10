import { navigation } from '@/constant/navigation';
import {
  Avatar,
  Dropdown,
  Flex,
  Layout,
  Menu,
  MenuProps,
  Typography,
} from 'antd';
import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
const { Header: HeaderAntd } = Layout;
const { Title, Text } = Typography;

const Header = () => {
  const { data } = useSession();

  const headerItems = [
    {
      label: (
        <Link href={navigation.woo}>
          <Title level={5}>Woo tool</Title>
        </Link>
      ),
      key: navigation.woo,
      children: [
        {
          label: <Link href='/woo/config-categories'>Config Categories</Link>,
          key: navigation.configCategories,
        },
        {
          label: <Link href='/woo/config-watermark'>Config Watermark</Link>,
          key: navigation.configWatermark,
        },
      ],
    },

    {
      label: (
        <Link href={navigation.openaiContent}>
          <Title level={5}>Openai Content</Title>
        </Link>
      ),
      key: navigation.openaiContent,
    },

    {
      label: (
        <Link href={navigation.crawlTool}>
          <Title level={5}>Crawl Tool</Title>
        </Link>
      ),
      key: navigation.crawlTool,
    },
  ];

  const dropdownItems: MenuProps['items'] = [
    {
      key: '1',
      label: (
        <Link href={navigation.setting}>
          <Flex vertical align='center'>
            <Avatar src={data?.user?.image} />
            <Text strong>{data?.user?.name}</Text>
          </Flex>
        </Link>
      ),
    },
    {
      key: '2',
      label: <Text onClick={() => signOut()}>Logout</Text>,
    },
  ];

  const pathName = usePathname();
  return (
    <HeaderAntd style={headerStyle}>
      <Flex align='center'>
        <Menu
          style={{ minWidth: 0, flex: 'auto' }}
          mode='horizontal'
          selectedKeys={[pathName]}
          items={headerItems}
          triggerSubMenuAction='hover'
        />
        <Dropdown
          menu={{ items: dropdownItems }}
          trigger={['click']}
          placement='bottomRight'
        >
          <Avatar src={data?.user?.image} style={{ cursor: 'pointer' }} />
        </Dropdown>
      </Flex>
    </HeaderAntd>
  );
};

const headerStyle: React.CSSProperties = {
  background: '#fff',
};

export default Header;
