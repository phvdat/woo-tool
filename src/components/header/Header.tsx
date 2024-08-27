import { useUser } from '@/app/hooks/user/useUser';
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
  const { user } = useUser(data?.user?.email as string);

  const headerItems = [
    {
      label: (
        <Link href={navigation.woo()}>
          <Title level={5}>Woo tool</Title>
        </Link>
      ),
      key: navigation.woo(),
      children: [
        {
          label: (
            <Link href={navigation.configStore(user?._id as string)}>
              Config Stores
            </Link>
          ),
          key: navigation.configStore(user?._id as string),
        },
      ],
    },

    {
      label: (
        <Link href={navigation.openaiContent()}>
          <Title level={5}>Openai Content</Title>
        </Link>
      ),
      key: navigation.openaiContent(),
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
