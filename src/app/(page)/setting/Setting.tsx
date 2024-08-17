'use client';
import { useUser } from '@/app/hooks/useUser';
import { UsersFormValues } from '@/components/management-users/ManagementUsersForm';
import { endpoint } from '@/constant/endpoint';
import { navigation } from '@/constant/navigation';
import { handleErrorMongoDB } from '@/helper/common';
import { Button, Form, Input, InputNumber, Typography } from 'antd';
import axios from 'axios';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
const { Title } = Typography;
const { TextArea } = Input;

interface SettingProps {
  isAdmin: boolean;
}

const Setting = ({ isAdmin }: SettingProps) => {
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    form.setFieldsValue({
      ...user,
    });
  }, [form, user]);

  return (
    <div
      style={{
        maxWidth: 600,
        margin: '20px auto',
      }}
    >
      <Form
        onFinish={updateInformation}
        form={form}
        initialValues={user}
        disabled={loading}
        labelCol={{ style: { minWidth: 150 } }}
        labelAlign='left'
      >
        <Form.Item<UsersFormValues>
          name='telegramId'
          label='Telegram ID'
          shouldUpdate
          rules={[{ required: true, message: 'Please input telegram id' }]}
        >
          <Input type='text' placeholder='Enter telegram id for receive file' />
        </Form.Item>
        <Form.Item<UsersFormValues>
          name='publicMinutes'
          label='Public Minutes'
          shouldUpdate
        >
          <InputNumber
            type='text'
            placeholder='Enter public minutes for public product'
            style={{ width: '100%' }}
          />
        </Form.Item>

        <Form.Item<UsersFormValues>
          name='apiKey'
          label='Key ChatGPT'
          rules={[{ required: true, message: 'Please input API key!' }]}
        >
          <Input type='text' placeholder='API key' />
        </Form.Item>

        <Form.Item<UsersFormValues>
          name='promptQuestion'
          label='Prompt Question'
          rules={[{ required: true, message: 'Please input prompt question!' }]}
        >
          <TextArea
            rows={4}
            placeholder='Ex: Write a story about {product-name} with 100 words'
          />
        </Form.Item>

        <Button type='primary' htmlType='submit'>
          Save
        </Button>
        {isAdmin && (
          <Button href={navigation.managementUser} style={{ marginLeft: 24 }}>
            Management Users
          </Button>
        )}
      </Form>
    </div>
  );
};

export default Setting;
