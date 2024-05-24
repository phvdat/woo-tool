'use client';
import { useUsers } from '@/app/hooks/useUsers';
import { endpoint } from '@/constant/endpoint';
import { handleErrorMongoDB } from '@/helper/common';
import { Alert, Button, Flex, List, Spin, Typography, message } from 'antd';
import axios from 'axios';
import { useState } from 'react';

const { Text } = Typography;

const UserList = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [messageApi, contextHolder] = message.useMessage();
  const { users, isError, mutate, isLoading } = useUsers();

  if (isError) {
    return <div>Error: {isError.message}</div>;
  }

  const handleDelete = async (_id: string) => {
    setLoading(true);
    try {
      await axios.delete(endpoint.users, { params: { _id } });
      messageApi.open({
        type: 'success',
        content: 'Delete user successfully!',
      });
      await mutate();
    } catch (error) {
      const { errorMessage } = handleErrorMongoDB(error);
      setError(errorMessage);
    }
    setLoading(false);
  };
  return (
    <div>
      {contextHolder}
      {isLoading ? (
        <Flex justify='center'>
          <Spin />
        </Flex>
      ) : null}
      <List
        itemLayout='horizontal'
        dataSource={users}
        renderItem={(item) => (
          <List.Item
            actions={
              item.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL
                ? [
                    <Button
                      key='delete-item'
                      onClick={() => handleDelete(item._id)}
                      loading={loading}
                      type='primary'
                      style={{ background: 'red' }}
                    >
                      Delete
                    </Button>,
                  ]
                : [
                    <Text key='delete-item' type='warning'>
                      Admin
                    </Text>,
                  ]
            }
          >
            <List.Item.Meta title={<Text type='success'>{item.email}</Text>} />
          </List.Item>
        )}
      />
      {error ? <Alert message={error} type='error' /> : null}
    </div>
  );
};

export default UserList;
