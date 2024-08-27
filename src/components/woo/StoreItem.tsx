import { StoreCollection } from '@/app/hooks/store/useStore';
import { useStoreList } from '@/app/hooks/store/useStoreList';
import { endpoint } from '@/constant/endpoint';
import { navigation } from '@/constant/navigation';
import { handleErrorMongoDB } from '@/helper/common';
import {
  Alert,
  Button,
  Col,
  DescriptionsProps,
  Flex,
  Popconfirm,
  Row,
  Typography,
  message,
} from 'antd';
import axios from 'axios';
import { useState } from 'react';
import UpdateStoreListModal from './UpdateStoreListModal';
import { mutate } from 'swr';
import { useSession } from 'next-auth/react';
const { Text } = Typography;

export interface StoreItemProps {
  _id: string;
  storeName: string;
  _userId: string;
}

const StoreItem = ({ _id, storeName, _userId }: StoreItemProps) => {
  const { data } = useSession();
  const [messageApi, contextHolder] = message.useMessage();
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleDeleteStore = async (_id: string, _userId: string) => {
    setLoading(true);
    const storeEndpoint = `${endpoint.store}/${_id}`;
    try {
      await axios.delete(storeEndpoint, {
        params: { _userId },
      });
      messageApi.open({
        type: 'success',
        content: 'Delete store successfully!',
      });
      await mutate(`${endpoint.user}/${data?.user?.email}`);
    } catch (error) {
      const { errorMessage } = handleErrorMongoDB(error);
      setError(errorMessage);
    }
    setLoading(false);
  };
  return (
    <>
      {contextHolder}
      <Row key={_id} style={{ width: '100%' }} gutter={[20, 20]}>
        <Col span={18}>
          <Text>{storeName}</Text>
        </Col>
        <Col span={6}>
          <Flex justify='end' gap={20}>
            <Popconfirm
              title='Delete the store?'
              onConfirm={() => handleDeleteStore(_id, _userId)}
              okText='Yes'
              cancelText='No'
            >
              <Button danger loading={loading}>
                Delete
              </Button>
            </Popconfirm>
            <Button href={navigation.configCategories(_id)}>
              Config Categories
            </Button>
            <UpdateStoreListModal _id={_id} _userId={_userId} />
          </Flex>
        </Col>
      </Row>
      {error ? <Alert message={error} type='error' /> : null}
    </>
  );
};

export default StoreItem;
