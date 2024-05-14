'use client';

import { sendMessage } from '@/services/send-message';
import { Button, Card, Form, Input, Spin, Typography } from 'antd';
import { useState } from 'react';
import _get from 'lodash/get';

const { Text } = Typography;

const Chat = () => {
  const [apiKey, setApiKey] = useState('');
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendMessage = async (message: string, apiKey: string) => {
    setLoading(true);
    setResponse('');
    try {
      const data = await sendMessage(message, apiKey);
      setResponse(_get(data, 'choices[0].message.content').replaceAll('*', ''));
    } catch (error) {
      console.log(error);
    }
    setLoading(false);
  };
  return (
    <div>
      <h1>Chat</h1>
      <Card style={{ maxWidth: 500 }}>
        <Form.Item>
          <Input
            type='text'
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
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
          <Button block onClick={() => handleSendMessage(message, apiKey)}>
            {loading ? <Spin /> : 'Send'}
          </Button>
        </Form.Item>
        <Text style={{ whiteSpace: 'break-spaces' }}>RES: {response}</Text>
      </Card>
    </div>
  );
};

export default Chat;
