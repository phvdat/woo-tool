'use client';
import { useConfigWebsite } from '@/app/hooks/useConfigWebsite';
import { endpoint } from '@/constant/endpoint';
import { handleErrorMongoDB } from '@/helper/common';
import {
  Alert,
  Button,
  Card,
  Col,
  Flex,
  Form,
  Input,
  Modal,
  Row,
  message,
} from 'antd';
import axios from 'axios';
import { useSession } from 'next-auth/react';
import { useState } from 'react';

interface AddNewCategoryProps {
  initialForm?: WebsiteFormValue;
  _id?: string;
  refresh: () => void;
}

export interface WebsiteFormValue {
  logoUrl: string;
  logoWidth: number;
  logoHeight: number;
  imageWidth: number;
  imageHeight: number;
  shopName: string;
  quality: number;
}

const defaultFormValue: WebsiteFormValue = {
  logoUrl: '',
  logoWidth: 1000,
  logoHeight: 1000,
  imageWidth: 1000,
  imageHeight: 1000,
  shopName: '',
  quality: 80,
};
const UpdateWebsiteListModal = ({
  initialForm = defaultFormValue,
  _id,
  refresh,
}: AddNewCategoryProps) => {
  const { data } = useSession();

  const [messageApi, contextHolder] = message.useMessage();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm<WebsiteFormValue>();
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const createWebsite = async (values: WebsiteFormValue) => {
    const payload = { ...values, owner: data?.user?.email };
    console.log(payload);
    try {
      await axios.post(endpoint.websiteConfigList, payload);
      messageApi.open({
        type: 'success',
        content: 'Create category successfully!',
      });
      refresh && (await refresh());
      setIsModalOpen(false);
    } catch (error) {
      const { errorMessage } = handleErrorMongoDB(error);
      setError(errorMessage);
    }
  };

  const updateWebsite = async (_id: string, values: WebsiteFormValue) => {
    try {
      await axios.put(endpoint.websiteConfigList, { _id, ...values });
      messageApi.open({
        type: 'success',
        content: 'Update category successfully!',
      });
      refresh();
      console.log('thanh cong');
      setIsModalOpen(false);
    } catch (error) {
      console.log('errrr ???', error);

      const { errorMessage } = handleErrorMongoDB(error);
      setError(errorMessage);
    }
  };

  const onSubmit = async (values: WebsiteFormValue) => {
    setLoading(true);
    setError('');
    if (_id) {
      await updateWebsite(_id, values);
    } else {
      await createWebsite(values);
    }
    setLoading(false);
  };
  return (
    <>
      {contextHolder}
      <Button onClick={() => setIsModalOpen(true)}>
        {_id ? 'Edit' : 'Add new Website List'}
      </Button>
      <Modal
        title='Category'
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        destroyOnClose
        maskClosable={false}
      >
        <Form
          form={form}
          layout='vertical'
          onFinish={onSubmit}
          name='add-category-form'
          disabled={loading}
          initialValues={initialForm}
        >
          <Card>
            <Form.Item<WebsiteFormValue>
              name='logoUrl'
              label='Logo URL'
              rules={[{ required: true, message: 'Please input Logo URL!' }]}
            >
              <Input type='text' placeholder='Logo URL' />
            </Form.Item>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item<WebsiteFormValue>
                  name='shopName'
                  label='Shop Name'
                  rules={[
                    { required: true, message: 'Please input Shop Name!' },
                  ]}
                >
                  <Input type='text' placeholder='Shop Name' />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item<WebsiteFormValue>
                  name='quality'
                  label='Quality'
                  rules={[{ required: true, message: 'Please input Quality!' }]}
                >
                  <Input type='number' placeholder='Quality' />
                </Form.Item>
              </Col>

              <Col span={12}>
                <Form.Item<WebsiteFormValue>
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
                <Form.Item<WebsiteFormValue>
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
                <Form.Item<WebsiteFormValue>
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
                <Form.Item<WebsiteFormValue>
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

export default UpdateWebsiteListModal;
