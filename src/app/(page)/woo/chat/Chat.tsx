'use client';

import { sendMessage } from '@/services/send-message';
import { Alert, Button, Card, Form, Input, Spin, Typography } from 'antd';
import { useEffect, useState } from 'react';
import _get from 'lodash/get';
import { useWoo } from '@/app/hooks/useWoo';

const { Text } = Typography;

const Chat = () => {
  const [message, setMessage] = useState(
    'what is highest mountain in the world?'
  );
  const { woo, isLoading } = useWoo()
  const [apiKey, setApiKey] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendMessage = async (message: string, apiKey: string) => {
    setLoading(true);
    setResponse('');
    setError('');
    try {
      const data = await sendMessage(message, apiKey);
      setResponse(
        _get(data, 'choices[0].message.content', '').replaceAll('*', '')
      );
    } catch (error: any) {
      setError((error as any).response.data.error.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (woo) {
      setApiKey(woo.apiKey)
    }
  }, [woo])

  return (
    <div>
      <h1>Test api key</h1>
      <Text type='warning'>
        This feature is used to test the accuracy of the gpt chat api
      </Text>
      <Card style={{ maxWidth: 500 }}>
        <Form.Item>
          <Input
            type='text'
            placeholder='API Key'
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
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
        <Text style={{ whiteSpace: 'break-spaces' }} type='warning'>RES: {response}</Text>
        {error && <Alert type='error' message={error} />}
      </Card>
    </div>
  );
};

export default Chat;
