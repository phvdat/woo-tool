'use client';
import { useStoreList } from '@/app/hooks/store/useStoreList';
import { useUser } from '@/app/hooks/user/useUser';
import StoreItem from '@/components/woo/StoreItem';
import UpdateStoreListModal from '@/components/woo/UpdateStoreListModal';
import { Alert, Divider, Flex, List, Row, Spin, Typography } from 'antd';
import { useSession } from 'next-auth/react';
const { Title } = Typography;

const ConfigStore = ({ userId }: { userId: string }) => {
  const { data } = useSession();
  const { user, isLoading } = useUser(data?.user?.email || '');
  console.log('user', user);

  return (
    <div>
      <Title level={4}>Config Store</Title>
      <List
        loading={isLoading}
        header={
          <Title level={4} style={{ textAlign: 'center' }}>
            Config Store
          </Title>
        }
        bordered
        dataSource={user?.stores}
        renderItem={(item) => (
          <List.Item>
            <StoreItem
              storeName={item.storeName}
              _id={item._id}
              _userId={userId}
            />
          </List.Item>
        )}
      />
      <Divider />
      <UpdateStoreListModal _userId={userId} />
    </div>
  );
};

export default ConfigStore;
