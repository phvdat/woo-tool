'use client';
import { useUser } from '@/app/hooks/useUser';
import { getSocket } from '@/config/socket';
import { endpoint } from '@/constant/endpoint';
import { normFile } from '@/helper/common';
import { Button, Card, Form, Progress, Switch, Upload } from 'antd';
import axios from 'axios';
import dayjs from 'dayjs';
import _get from 'lodash/get';
import { useSession } from 'next-auth/react';
import { useEffect, useMemo, useState } from 'react';

interface OpenaiFormValues {
  promptQuestion: string;
  website: string;
  apiKey: string;
  file: FileList;
  mixed: boolean;
}

const OpenaiContentForm = () => {
  const [form] = Form.useForm();
  const [progress, setProgress] = useState<number>(0);
  const socket = useMemo(() => {
    const socket = getSocket();
    return socket.connect();
  }, []);

  const [loading, setLoading] = useState<boolean>(false);
  const { data } = useSession();
  const { user, isLoading } = useUser(data?.user?.email || '');
  const [socketId, setSocketId] = useState<number>();

  const onFinish = async (value: OpenaiFormValues) => {
    const socketId = dayjs().unix();
    setSocketId(socketId);
    setProgress(0);
    setLoading(true);
    const { file, mixed } = value;
    const fileOrigin = _get(file[0], 'originFileObj');

    const fileName = value.file[0].name;
    const website = fileName.split('-')[0];

    if (fileOrigin && user) {
      try {
        const formData = new FormData();
        formData.append('file', fileOrigin);
        formData.append('mixed', String(mixed));
        formData.append('telegramId', user.telegramId);
        formData.append('promptQuestion', user.promptQuestion);
        formData.append('apiKey', user.apiKey);
        formData.append('website', website);
        formData.append('publicTime', (user?.publicTime || 0).toString());
        formData.append('gapFrom', (user?.gapFrom || 0).toString());
        formData.append('gapTo', (user?.gapTo || 0).toString());
        formData.append('socketId', socketId.toString());
        await axios.post(endpoint.openaiGenerate, formData);
      } catch (error: any) {
        console.log('error-openai', error);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    socket.on('openai-progress', (payload) => {
      if (Number(_get(payload, 'socketId')) !== socketId) return;
      setProgress(_get(payload, 'progress'));
    });

    return () => {
      socket.off('openai-progress');
    };
  }, [socketId]);

  return (
    <Form
      form={form}
      onFinish={onFinish}
      layout='vertical'
      disabled={loading || isLoading}
      initialValues={{
        mixed: true,
      }}
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

        {progress ? (
          <Progress
            percent={progress}
            strokeColor={{ from: '#108ee9', to: '#87d068' }}
          />
        ) : null}

        <Form.Item<OpenaiFormValues>
          name='mixed'
          valuePropName='checked'
          label='Mixed'
        >
          <Switch />
        </Form.Item>

        <Button htmlType='submit' loading={loading} block type='primary'>
          Process
        </Button>
      </Card>
    </Form>
  );
};

export default OpenaiContentForm;
