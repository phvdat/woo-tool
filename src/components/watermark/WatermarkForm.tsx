'use client';
import { Button, Card, Flex, Form, Input } from 'antd';
import { useState } from 'react';
import { useLocalStorage } from 'usehooks-ts';

interface FormValue {
  logoUrl: string;
  logoWidth: number;
  logoHeight: number;
  imageWidth: number;
  imageHeight: number;
  idTelegram: string;
  shopName: string;
  quality: number;
}

const WatermarkForm = () => {
  const [form] = Form.useForm<FormValue>();
  const [loading, setLoading] = useState<boolean>(false);
  const [formValueLocal, setFormValueLocal] = useLocalStorage(
    'formValueLocal',
    JSON.stringify({
      logoUrl: '',
      logoWidth: 1000,
      logoHeight: 1000,
      imageWidth: 1000,
      imageHeight: 1000,
      quality: 50,
      idTelegram: '',
      shopName: '',
    })
  );

  const onFinish = async (value: FormValue) => {
    setLoading(true);
    try {
    } catch (error) {}
    setLoading(false);
  };

  return (
    <Form form={form} onFinish={onFinish} layout='vertical'>
      <Card>
        <Form.Item<FormValue>
          name='shopName'
          label='Key ChatGPT'
          rules={[{ required: true, message: 'Please input Shop Name!' }]}
        >
          <Input type='text' placeholder='Shop Name' />
        </Form.Item>
        <Form.Item<FormValue>
          name='idTelegram'
          label='Telegram ID'
          rules={[{ required: true, message: 'Please input Telegram ID!' }]}
        >
          <Input type='text' placeholder='Telegram ID' />
        </Form.Item>
        <Form.Item<FormValue>
          name='logoUrl'
          label='Logo URL'
          rules={[{ required: true, message: 'Please input Logo URL!' }]}
        >
          <Input type='text' placeholder='Logo URL' />
        </Form.Item>
        <Form.Item<FormValue>
          name='logoWidth'
          label='Logo Width'
          rules={[{ required: true, message: 'Please input Logo Width!' }]}
        >
          <Input type='number' placeholder='Logo Width' />
        </Form.Item>
        <Form.Item<FormValue>
          name='logoHeight'
          label='Logo Height'
          rules={[{ required: true, message: 'Please input Logo Height!' }]}
        >
          <Input type='number' placeholder='Logo Height' />
        </Form.Item>
        <Form.Item<FormValue>
          name='imageWidth'
          label='Image Width'
          rules={[{ required: true, message: 'Please input Image Width!' }]}
        >
          <Input type='number' placeholder='Image Width' />
        </Form.Item>
        <Form.Item<FormValue>
          name='imageHeight'
          label='Image Height'
          rules={[{ required: true, message: 'Please input Image Height!' }]}
        >
          <Input type='number' placeholder='Image Height' />
        </Form.Item>
        <Form.Item<FormValue>
          name='quality'
          label='Quality'
          rules={[{ required: true, message: 'Please input Quality!' }]}
        >
          <Input type='number' placeholder='Quality' />
        </Form.Item>
      </Card>
      <Flex justify='center' gap={16} style={{ marginTop: 24 }}>
        <Button htmlType='submit' loading={loading}>
          Process
        </Button>
        {false && (
          <Button htmlType='button' type='primary'>
            Download
          </Button>
        )}
      </Flex>
    </Form>
  );
};

export default WatermarkForm;
