import { navigation } from '@/constant/navigation';
import { BarsOutlined } from '@ant-design/icons';
import {
  Avatar,
  Drawer,
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
import { useState } from 'react';
import { useMediaQuery } from 'usehooks-ts';
const { Header: HeaderAntd } = Layout;
const { Title, Text } = Typography;

const Header = () => {
  const { data } = useSession();

  const headerItems = [
    {
      label: <Link href={navigation.woo}>Woo tool</Link>,
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
      label: <Link href={navigation.openaiContent}>Openai Content</Link>,
      key: navigation.openaiContent,
    },
    {
      label: (
        <Link href={navigation.updatePublishedTime}>Update Published Time</Link>
      ),
      key: navigation.updatePublishedTime,
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

  const [open, setOpen] = useState(false);
  const pathName = usePathname();
  const pcMedia = useMediaQuery('(min-width: 768px)');
  return (
    <HeaderAntd style={headerStyle}>
      <Flex
        align='center'
        justify='space-between'
        style={{ width: '100%', height: '100%' }}
      >
        <Menu
          style={{ minWidth: 1, flex: 1 }}
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
  minHeight: '64px',
};

export default Header;
