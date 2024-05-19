'use client';
import { Alert, Button, Card, Col, Flex, Form, Input, Row, Upload } from 'antd';
import { useState } from 'react';
import { useLocalStorage } from 'usehooks-ts';
import _toString from 'lodash/toString';
import axios from 'axios';
import { endpoint } from '@/constant/endpoint';
import { normFile } from '@/helper/common';
import _get from 'lodash/get';

const KEY_LOCAL_STORAGE_WATERMARK_FORM = 'watermark-form';

interface FormValue {
  logoUrl: string;
  logoWidth: number;
  logoHeight: number;
  imageWidth: number;
  imageHeight: number;
  idTelegram: string;
  shopName: string;
  quality: number;
  excelFile: File[];
}

const WatermarkForm = () => {
  const [form] = Form.useForm<FormValue>();
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState('');
  const [formValueLocal, setFormValueLocal] = useLocalStorage(
    KEY_LOCAL_STORAGE_WATERMARK_FORM,
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
    setMessage('');
    const excelFile = _get(value, 'excelFile[0].originFileObj', null);
    if (!excelFile) {
      setLoading(false);
      return;
    }
    const formData = new FormData();
    formData.append('excelFile', excelFile);
    formData.append('logoUrl', value.logoUrl);
    formData.append('logoWidth', _toString(value.logoWidth));
    formData.append('logoHeight', _toString(value.logoHeight));
    formData.append('imageWidth', _toString(value.imageWidth));
    formData.append('imageHeight', _toString(value.imageHeight));
    formData.append('quality', _toString(value.quality));
    formData.append('idTelegram', value.idTelegram);
    formData.append('shopName', value.shopName);

    try {
      await axios.post(endpoint.watermark, formData);
      const { excelFile, ...formLocal } = value;
      setFormValueLocal(JSON.stringify(formLocal));
    } catch (error) {
      console.error('Error uploading the Excel file:', error);
    } finally {
      setMessage(
        'Processing the images, waiting about 10 min and check telegram message...'
      );
    }
    setLoading(false);
  };

  return (
    <Form
      form={form}
      onFinish={onFinish}
      layout='vertical'
      initialValues={{ ...JSON.parse(formValueLocal) }}
    >
      <Card>
        <Form.Item<FormValue>
          name='logoUrl'
          label='Logo URL'
          rules={[{ required: true, message: 'Please input Logo URL!' }]}
        >
          <Input type='text' placeholder='Logo URL' />
        </Form.Item>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item<FormValue>
              name='excelFile'
              rules={[{ required: true, message: 'Please upload file!' }]}
              valuePropName='fileList'
              label='File'
              getValueFromEvent={normFile}
            >
              <Upload maxCount={1}>
                <Button>Upload file excel</Button>
              </Upload>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item<FormValue>
              name='idTelegram'
              label='Telegram ID'
              rules={[{ required: true, message: 'Please input Telegram ID!' }]}
            >
              <Input type='text' placeholder='Telegram ID' />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item<FormValue>
              name='shopName'
              label='Shop Name'
              rules={[{ required: true, message: 'Please input Shop Name!' }]}
            >
              <Input type='text' placeholder='Shop Name' />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item<FormValue>
              name='quality'
              label='Quality'
              rules={[{ required: true, message: 'Please input Quality!' }]}
            >
              <Input type='number' placeholder='Quality' />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item<FormValue>
              name='logoWidth'
              label='Logo Width'
              rules={[{ required: true, message: 'Please input Logo Width!' }]}
            >
              <Input type='number' placeholder='Logo Width' />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item<FormValue>
              name='logoHeight'
              label='Logo Height'
              rules={[{ required: true, message: 'Please input Logo Height!' }]}
            >
              <Input type='number' placeholder='Logo Height' />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item<FormValue>
              name='imageWidth'
              label='Image Width'
              rules={[{ required: true, message: 'Please input Image Width!' }]}
            >
              <Input type='number' placeholder='Image Width' />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item<FormValue>
              name='imageHeight'
              label='Image Height'
              rules={[
                { required: true, message: 'Please input Image Height!' },
              ]}
            >
              <Input type='number' placeholder='Image Height' />
            </Form.Item>
          </Col>
        </Row>
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
      {message ? (
        <Alert message={message} type='info' style={{ marginTop: 24 }} />
      ) : null}
    </Form>
  );
};

export default WatermarkForm;
