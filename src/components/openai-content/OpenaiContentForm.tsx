'use client';
import { useUser } from '@/app/hooks/user/useUser';
import { endpoint } from '@/constant/endpoint';
import { normFile } from '@/helper/common';
import { Alert, Button, Card, Form, Input, Upload } from 'antd';
import axios from 'axios';
import _get from 'lodash/get';
import { useSession } from 'next-auth/react';
import { useState } from 'react';
const { TextArea } = Input;

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

    if (fileOrigin && user?.setting) {
      try {
        const formData = new FormData();
        formData.append('file', fileOrigin);
        formData.append('telegramId', user.setting.telegramId);
        formData.append('promptQuestion', user.setting.promptQuestion);
        formData.append('apiKey', user.setting.apiKey);
        formData.append('publicMinutes', user.setting.publicMinutes.toString());
        formData.append('gapMinutes', user.setting.gapMinutes.toString());
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
