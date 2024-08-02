'use client';
import { UsersPayload, useUsers } from '@/app/hooks/useUsers';
import { endpoint } from '@/constant/endpoint';
import { handleErrorMongoDB } from '@/helper/common';
import { Alert, Button, Form, Input, message } from 'antd';
import axios from 'axios';
import { useState } from 'react';

export interface UsersFormValues extends Omit<UsersPayload, '_id'> {}

const ManagementUsersForm = () => {
  const [form] = Form.useForm<UsersFormValues>();
  const [error, setError] = useState<string>('');
  const { mutate } = useUsers();
  const [messageApi, contextHolder] = message.useMessage();

  const createUser = async (values: UsersFormValues) => {
    try {
      await axios.post(endpoint.users, values);
      messageApi.open({
        type: 'success',
        content: 'Create user successfully!',
      });
      await mutate();
      form.resetFields();
    } catch (error) {
      const { errorMessage } = handleErrorMongoDB(error);
      setError(errorMessage);
    }
  };

  const onFinish = (values: any) => {
    createUser(values);
  };

  return (
    <>
      {contextHolder}
      <Form onFinish={onFinish} form={form}>
        <Form.Item<UsersFormValues>
          name='email'
          rules={[
            {
              required: true,
              message: 'Please input your email!',
            },
            { type: 'email', message: 'The input is not valid E-mail!' },
          ]}
        >
          <Input type='email' placeholder='Enter email' />
        </Form.Item>
        <Button htmlType='submit'>Add email</Button>
      </Form>
      {error ? <Alert message={error} type='error' /> : null}
    </>
  );
};

export default ManagementUsersForm;
