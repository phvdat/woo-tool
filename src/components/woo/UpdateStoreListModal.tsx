'use client';
import { StoreCollection, useStore } from '@/app/hooks/store/useStore';
import { useStoreList } from '@/app/hooks/store/useStoreList';
import { endpoint } from '@/constant/endpoint';
import { handleErrorMongoDB } from '@/helper/common';
import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Flex,
  Form,
  Input,
  Modal,
  Row,
  message,
} from 'antd';
import axios from 'axios';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { mutate } from 'swr';

interface UpdateStoreListProps {
  _id?: string;
  _userId?: string;
}

export interface WatermarkFormValue {
  logoUrl: string;
  logoWidth: number;
  logoHeight: number;
  imageWidth: number;
  imageHeight: number;
  shopName: string;
  quality: number;
}

const defaultFormValue: WatermarkFormValue = {
  logoUrl: '',
  logoWidth: 1000,
  logoHeight: 1000,
  imageWidth: 1000,
  imageHeight: 1000,
  shopName: '',
  quality: 70,
};
const UpdateStoreListModal = ({ _id, _userId }: UpdateStoreListProps) => {
  const { data } = useSession();
  const [messageApi, contextHolder] = message.useMessage();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm<WatermarkFormValue>();
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const { store } = useStore(_id as string);
  const createStore = async (values: WatermarkFormValue, _userId: string) => {
    const payload: Partial<StoreCollection> & { _userId: string } = {
      watermark: values,
      categories: [],
      _userId: _userId as string,
    };
    console.log('abc', payload);
    try {
      await axios.post(endpoint.store, payload);
      messageApi.open({
        type: 'success',
        content: 'Create store successfully!',
      });
      setIsModalOpen(false);
    } catch (error) {
      const { errorMessage } = handleErrorMongoDB(error);
      setError(errorMessage);
    }
  };

  const updateStore = async (
    _id: string,
    values: WatermarkFormValue,
    _userId: string
  ) => {
    try {
      const payload: Partial<StoreCollection> & { _userId: string } = {
        watermark: values,
        _userId: _userId,
      };
      const storeEndpoint = `${endpoint.store}/${_id}`;
      await axios.put(storeEndpoint, payload);
      messageApi.open({
        type: 'success',
        content: 'Update store successfully!',
      });
      setIsModalOpen(false);
    } catch (error) {
      const { errorMessage } = handleErrorMongoDB(error);
      setError(errorMessage);
    }
  };

  const onSubmit = async (values: WatermarkFormValue) => {
    setLoading(true);
    setError('');
    if (_id) {
      await updateStore(_id, values, _userId as string);
    } else {
      await createStore(values, _userId as string);
    }
    await mutate(`${endpoint.user}/${data?.user?.email}`);
    setLoading(false);
  };

  useEffect(() => {
    if (store) {
      form.setFieldsValue(store?.watermark);
    }
  }, [store]);

  return (
    <>
      {contextHolder}
      <Button onClick={() => setIsModalOpen(true)}>
        {_id ? 'Edit' : 'Add new Store List'}
      </Button>
      <Modal
        title='Store'
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form
          form={form}
          layout='vertical'
          onFinish={onSubmit}
          name='add-watermark-form'
          disabled={loading}
          initialValues={defaultFormValue}
        >
          <Card>
            <Form.Item<WatermarkFormValue>
              name='shopName'
              label='Shop Name'
              rules={[{ required: true, message: 'Please input Shop Name!' }]}
            >
              <Input type='text' placeholder='Shop Name' />
            </Form.Item>

            <Divider />

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item<WatermarkFormValue>
                  name='logoUrl'
                  label='Logo URL'
                  rules={[
                    { required: true, message: 'Please input Logo URL!' },
                  ]}
                >
                  <Input type='text' placeholder='Logo URL' />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item<WatermarkFormValue>
                  name='quality'
                  label='Quality'
                  rules={[{ required: true, message: 'Please input Quality!' }]}
                >
                  <Input type='number' placeholder='Quality' />
                </Form.Item>
              </Col>

              <Col span={12}>
                <Form.Item<WatermarkFormValue>
                  name='logoWidth'
                  label='Logo Width'
                  rules={[
                    { required: true, message: 'Please input Logo Width!' },
                  ]}
                >
                  <Input type='number' placeholder='Logo Width' />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item<WatermarkFormValue>
                  name='logoHeight'
                  label='Logo Height'
                  rules={[
                    { required: true, message: 'Please input Logo Height!' },
                  ]}
                >
                  <Input type='number' placeholder='Logo Height' />
                </Form.Item>
              </Col>

              <Col span={12}>
                <Form.Item<WatermarkFormValue>
                  name='imageWidth'
                  label='Image Width'
                  rules={[
                    { required: true, message: 'Please input Image Width!' },
                  ]}
                >
                  <Input type='number' placeholder='Image Width' />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item<WatermarkFormValue>
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
              Submit
            </Button>
          </Flex>
          {error ? (
            <Alert message={error} type='error' style={{ marginTop: 24 }} />
          ) : null}
        </Form>
      </Modal>
    </>
  );
};

export default UpdateStoreListModal;
