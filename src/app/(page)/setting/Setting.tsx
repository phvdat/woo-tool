'use client';
import { useUser } from '@/app/hooks/useUser';
import { UsersFormValues } from '@/components/management-users/ManagementUsersForm';
import ManagementStorage from '@/components/setting/ManagementStorage';
import { endpoint } from '@/constant/endpoint';
import { navigation } from '@/constant/navigation';
import { handleErrorMongoDB } from '@/helper/common';
import {
  Button,
  Col,
  Divider,
  Flex,
  Form,
  Input,
  InputNumber,
  Row,
} from 'antd';
import axios from 'axios';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
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
      const payload = {
        ...values,
      };

      await axios.put(endpoint.user, {
        ...payload,
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

        <Divider />

        <Form.Item<UsersFormValues>
          name='publicTime'
          label='Public Minutes'
          shouldUpdate
        >
          <InputNumber
            type='text'
            placeholder='Enter waiting minutes for start public'
            style={{ width: '100%' }}
          />
        </Form.Item>

        <Row gutter={[20, 20]}>
          <Col span={12}>
            <Form.Item<UsersFormValues>
              label='Gap Time From'
              name='gapFrom'
              rules={[{ required: true, message: 'Please input gap time!' }]}
            >
              <InputNumber
                min={0}
                style={{ width: '100%' }}
                placeholder='From'
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item<UsersFormValues>
              label='Gap Time To'
              name='gapTo'
              rules={[{ required: true, message: 'Please input gap time!' }]}
            >
              <InputNumber
                min={0}
                style={{ width: '100%' }}
                placeholder='From'
              />
            </Form.Item>
          </Col>
        </Row>

        <Divider />

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

        <Button type='primary' htmlType='submit' loading={loading}>
          Save
        </Button>
      </Form>
      {isAdmin && (
        <Flex vertical style={{ marginTop: 20 }} gap={20}>
          <Button href={navigation.managementUser}>Management Users</Button>
          <ManagementStorage />
        </Flex>
      )}
    </div>
  );
};

export default Setting;
