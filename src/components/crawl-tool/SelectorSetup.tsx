'use client';
import { endpoint } from '@/constant/endpoint';
import { Button, Col, Form, Input, List, message, Row, Typography } from 'antd';
import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';

const { Text } = Typography;

export interface SelectorFormValues {
  _id?: string;
  domain: string;
  nameSelector: string;
  imagesSelector: string;
}

const SelectorSetup = () => {
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();
  const [existSelectors, setExistSelector] = useState<SelectorFormValues[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [testData, setTestData] = useState<any>();
  const listExistDomain = useMemo(
    () => existSelectors.map((item) => item.domain),
    [existSelectors]
  );

  const getAllSelectors = async () => {
    setLoading(true);
    try {
      const { status, data } = await axios.get(endpoint.addSelector);
      if (status === 200) {
        setExistSelector(data);
        console.log(data);
      }
    } catch (error) {
      console.log('getAllSelectors:', error);
    } finally {
      setLoading(false);
    }
  };

  const addNewSelector = async (formValues: SelectorFormValues) => {
    try {
      const { status } = await axios.post(endpoint.addSelector, formValues);
      if (status === 200) {
        messageApi.info('Success');
        await getAllSelectors();
      }
    } catch (error) {
      console.log('addNewSelector:', error);
    }
  };

  const handleDelete = async (_id: string) => {
    try {
      const { status } = await axios.delete(endpoint.addSelector, {
        params: { _id },
      });
      if (status === 200) {
        messageApi.info('Success');
        await getAllSelectors();
      }
    } catch (error) {
      console.log('handleDelete:', error);
    }
  };

  const handleTestUrl = async () => {
    setTestData(null);
    const testUrl = form.getFieldValue('testUrl');
    messageApi.info('Testing...');
    try {
      const { status, data } = await axios.post(
        endpoint.crawlMixedProductDetail,
        {
          urls: testUrl,
          selectors: [form.getFieldsValue()],
        }
      );
      if (status === 200) {
        messageApi.info('Test successful');
        console.log(data);
        setTestData(data[0]);
      }
    } catch (error) {
      console.log('handleTestUrl:', error);
      messageApi.error('Test failed');
    }
  };

  useEffect(() => {
    getAllSelectors();
  }, []);

  return (
    <div>
      {contextHolder}

      <Form form={form} onFinish={addNewSelector} name='selector-form'>
        <Form.Item<SelectorFormValues>
          name='domain'
          rules={[
            {
              required: true,
              message: 'Required',
            },
            {
              validator: (_, value) =>
                listExistDomain.includes(value)
                  ? Promise.reject(new Error('Exist Domain'))
                  : Promise.resolve(),
            },
          ]}
        >
          <Input placeholder='Domain' />
        </Form.Item>

        <Form.Item<SelectorFormValues>
          name='nameSelector'
          rules={[
            {
              required: true,
              message: 'Required',
            },
          ]}
        >
          <Input placeholder='Title Selector' />
        </Form.Item>

        <Form.Item<SelectorFormValues>
          name='imagesSelector'
          rules={[
            {
              required: true,
              message: 'Required',
            },
          ]}
        >
          <Input placeholder='Images Selector' />
        </Form.Item>
        <Form.Item>
          <Button htmlType='submit' type='primary'>
            Add new Selector
          </Button>
        </Form.Item>
        <Form.Item name='testUrl'>
          <Input
            placeholder='test url'
            suffix={<Button onClick={handleTestUrl}>Test</Button>}
          />
        </Form.Item>
        {testData && (
          <Row>
            <Col span={24}>
              <b>Name: </b>
              {testData?.Name}
            </Col>
            <Col span={24}>
              <b>Images: </b>
              {testData?.Images}
            </Col>
          </Row>
        )}
      </Form>
      <List
        loading={loading}
        bordered
        dataSource={existSelectors}
        renderItem={(item) => (
          <List.Item
            actions={[
              <a key='more' onClick={() => handleDelete(item?._id || '')}>
                Delete
              </a>,
            ]}
          >
            <List.Item.Meta
              title={<Text>{item.domain}</Text>}
              description={
                <Row>
                  <Col span={24}>
                    <b>Name: </b>
                    {item.nameSelector}
                  </Col>
                  <Col span={24}>
                    <b>Images: </b>
                    {item.imagesSelector}
                  </Col>
                </Row>
              }
            />
          </List.Item>
        )}
      />
    </div>
  );
};

export default SelectorSetup;
