'use client';

import { sendMessage } from '@/services/send-message';
import { Button, Card, Form, Input, Spin, Typography } from 'antd';
import { useState } from 'react';
import _get from 'lodash/get';
import { useLocalStorage } from 'usehooks-ts';
import { KEY_LOCAL_STORAGE } from '@/components/woo/WooForm';

const { Text } = Typography;

const Chat = () => {
  const [apiKeyLocal, setApiKeyLocal] = useLocalStorage(KEY_LOCAL_STORAGE, '');
  const [message, setMessage] = useState(
    'what is highest mountain in the world?'
  );
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendMessage = async (message: string, apiKey: string) => {
    setLoading(true);
    setResponse('');
    try {
      const data = await sendMessage(message, apiKey);
      setResponse(
        _get(data, 'choices[0].message.content', '').replaceAll('*', '')
      );
    } catch (error) {
      console.log(error);
    }
    setLoading(false);
  };
  return (
    <div>
      <h1>Chat</h1>
      {/* tính năng này dùng để test độ chính xác của api chat gpt */}
      <Text type='warning'>
        This feature is used to test the accuracy of the gpt chat api
      </Text>
      <Card style={{ maxWidth: 500 }}>
        <Form.Item>
          <Input
            type='text'
            value={apiKeyLocal}
            onChange={(e) => setApiKeyLocal(e.target.value)}
            placeholder='API Key'
          />
        </Form.Item>

        <Form.Item>
          <Input
            type='text'
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder='Message'
          />
        </Form.Item>

        <Form.Item>
          <Button block onClick={() => handleSendMessage(message, apiKeyLocal)}>
            {loading ? <Spin /> : 'Send'}
          </Button>
        </Form.Item>
        <Text style={{ whiteSpace: 'break-spaces' }}>RES: {response}</Text>
      </Card>
    </div>
  );
};

export default Chat;
