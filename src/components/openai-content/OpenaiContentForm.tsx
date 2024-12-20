'use client';
import { useUser } from '@/app/hooks/useUser';
import { endpoint } from '@/constant/endpoint';
import { normFile } from '@/helper/common';
import { Alert, Button, Card, Form, Progress, Upload } from 'antd';
import axios from 'axios';
import _get from 'lodash/get';
import { useSession } from 'next-auth/react';
import { useEffect, useMemo, useState } from 'react';
import { GAP_MINUTES, PUBLIC_TIME } from '../woo/WooForm';
import { getSocket } from '@/config/socket';
import dayjs from 'dayjs';

interface OpenaiFormValues {
  promptQuestion: string;
  apiKey: string;
  file: FileList;
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
          'publicTime',
          (user?.publicTime || PUBLIC_TIME).toString()
        );
        formData.append(
          'gapMinutes',
          (user?.gapMinutes || GAP_MINUTES).toString()
        );
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

        <Button htmlType='submit' loading={loading} block type='primary'>
          Process
        </Button>
      </Card>
    </Form>
  );
};

export default OpenaiContentForm;
