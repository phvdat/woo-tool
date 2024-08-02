'use client';
import { useUser } from '@/app/hooks/useUser';
import { UsersFormValues } from '@/components/management-users/ManagementUsersForm';
import { endpoint } from '@/constant/endpoint';
import { handleErrorMongoDB } from '@/helper/common';
import { Button, Form, Input, Typography } from 'antd';
import axios from 'axios';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
const { Title } = Typography;

const MyProfile = () => {
  const [form] = Form.useForm<UsersFormValues>();
  const { data } = useSession();
  const { user } = useUser(data?.user?.email || '');
  const [loading, setLoading] = useState<boolean>(false);

  const updateInformation = async (values: UsersFormValues) => {
    setLoading(true);
    try {
      await axios.put(endpoint.user, {
        ...values,
        email: data?.user?.email,
      });
    } catch (error) {
      const { errorMessage } = handleErrorMongoDB(error);
      console.log('error update user', errorMessage);
    }
  };

  useEffect(() => {
    form.setFieldsValue({
      telegramId: user?.telegramId,
    });
  }, [form, user]);

  return (
    <div
      style={{
        maxWidth: 600,
        margin: '20px auto',
      }}
    >
      <Title level={4} style={{ textAlign: 'center' }}>
        <Form
          onFinish={updateInformation}
          layout='vertical'
          form={form}
          initialValues={user}
          disabled={loading}
        >
          <Form.Item<UsersFormValues>
            name='telegramId'
            label='Telegram ID'
            shouldUpdate
          >
            <Input
              type='text'
              placeholder='Enter telegram id for receive file'
            />
          </Form.Item>
          <Button type='primary' htmlType='submit'>
            Save
          </Button>
        </Form>
      </Title>
    </div>
  );
};

export default MyProfile;
