'use client';
import { normFile } from '@/helper/common';
import { Alert, Button, Card, Form, Input, Upload } from 'antd';
import { useState } from 'react';
const { TextArea } = Input;
import _get from 'lodash/get';
import { useUser } from '@/app/hooks/useUser';
import { useSession } from 'next-auth/react';
import { endpoint } from '@/constant/endpoint';
import axios from 'axios';
import { GAP_MINUTES, PUBLIC_MINUTES } from '../woo/WooForm';

interface OpenaiFormValues {
  promptQuestion: string;
  apiKey: string;
  file: FileList;
}

const OpenaiContentForm = () => {
  const [form] = Form.useForm();

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const { data } = useSession();
  const { user, isLoading } = useUser(data?.user?.email || '');

  const onFinish = async (value: OpenaiFormValues) => {
    setError('');
    setLoading(true);
    const { file } = value;
    const fileOrigin = _get(file[0], 'originFileObj');

    if (fileOrigin && user) {
      try {
        const formData = new FormData();
        formData.append('file', fileOrigin);
        formData.append('telegramId', user.telegramId);
        formData.append('promptQuestion', user.promptQuestion);
        formData.append('apiKey', user.apiKey);
        formData.append(
          'publicMinutes',
          (user?.publicMinutes || PUBLIC_MINUTES).toString()
        );
        formData.append(
          'gapMinutes',
          (user?.gapMinutes || GAP_MINUTES).toString()
        );
        await axios.post(endpoint.openaiGenerate, formData);
      } catch (error: any) {
        setError(_get(error, 'response.data.message', ''));
      }
    }
    setLoading(false);
  };

  return (
    <Form
      form={form}
      onFinish={onFinish}
      layout='vertical'
      disabled={loading || isLoading}
    >
      <Card>
        <Form.Item<OpenaiFormValues>
          name='file'
          valuePropName='fileList'
          label='File'
          getValueFromEvent={normFile}
          rules={[{ required: true, message: 'Please upload file!' }]}
        >
          <Upload maxCount={1} style={{ width: '100%' }}>
            <Button block>Upload file excel</Button>
          </Upload>
        </Form.Item>
        <Button htmlType='submit' loading={loading} block type='primary'>
          Process
        </Button>
      </Card>
      {error && (
        <Alert message={error} type='error' style={{ marginTop: 24 }} />
      )}
    </Form>
  );
};

export default OpenaiContentForm;
