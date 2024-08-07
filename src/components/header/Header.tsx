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
        <Link href='/home'>
          <Title level={5}>Home</Title>
        </Link>
      ),
      key: '/home',
    },
    {
      label: (
        <Link href='/woo'>
          <Title level={5}>Woo tool</Title>
        </Link>
      ),
      key: '/woo',
      children: [
        {
          label: <Link href='/woo/config-categories'>Config Categories</Link>,
          key: '/woo/config-categories',
        },
        {
          label: <Link href='/woo/config-watermark'>Config Watermark</Link>,
          key: '/woo/config-watermark',
        },
      ],
    },
  ];

  const dropdownItems: MenuProps['items'] = [
    {
      key: '1',
      label: (
        <Link href={navigation.profile}>
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
          <Avatar src={data?.user?.image} />
        </Dropdown>
      </Flex>
    </HeaderAntd>
  );
};

const headerStyle: React.CSSProperties = {
  background: '#fff',
};

export default Header;
