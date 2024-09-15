'use client';
import { useCategories } from '@/app/hooks/useCategories';
import { useWatermarkConfig } from '@/app/hooks/useWatermarkConfig';
import { endpoint } from '@/constant/endpoint';
import { handleErrorMongoDB } from '@/helper/common';
import { WooFixedOption } from '@/helper/woo';
import {
  Alert,
  Button,
  Col,
  Form,
  Input,
  Modal,
  Row,
  Select,
  message,
} from 'antd';
import TextArea from 'antd/es/input/TextArea';
import axios from 'axios';
import { useMemo, useState } from 'react';
import { mutate } from 'swr';

export interface CategoryFormValue extends WooFixedOption {
  templateName: string;
}

export enum TypeUpdateCategory {
  ADD_CATEGORY = 'Add New',
  EDIT_CATEGORY = 'Edit',
  DUPLICATE_CATEGORY = 'Duplicate',
}

interface UpdateCategoryProps {
  initialForm?: CategoryFormValue;
  _id?: string;
  label: TypeUpdateCategory;
}

const UpdateCategoryModal = ({
  initialForm,
  _id,
  label,
}: UpdateCategoryProps) => {
  const [messageApi, contextHolder] = message.useMessage();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm<CategoryFormValue>();
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const { watermarkConfig } = useWatermarkConfig();

  const watermarkOptions = useMemo(() => {
    if (!watermarkConfig) return [];
    return watermarkConfig.map((watermark) => ({
      label: watermark.shopName,
      value: watermark._id,
    }));
  }, [watermarkConfig]);

  const createCategory = async (values: CategoryFormValue) => {
    try {
      await axios.post(endpoint.categoryConfig, values);
      messageApi.open({
        type: 'success',
        content: 'Create category successfully!',
      });
      setIsModalOpen(false);
    } catch (error) {
      const { errorMessage } = handleErrorMongoDB(error);
      setError(errorMessage);
    }
  };

  const updateCategory = async (_id: string, values: CategoryFormValue) => {
    try {
      await axios.put(endpoint.categoryConfig, { _id, ...values });
      messageApi.open({
        type: 'success',
        content: 'Update category successfully!',
      });
      setIsModalOpen(false);
    } catch (error) {
      const { errorMessage } = handleErrorMongoDB(error);
      setError(errorMessage);
    }
  };

  const onSubmit = async (values: CategoryFormValue) => {
    setLoading(true);
    setError('');
    if (label === TypeUpdateCategory.EDIT_CATEGORY && _id) {
      await updateCategory(_id, values);
    } else {
      await createCategory(values);
    }
    await mutate([endpoint.categoryConfig, '']);
    setLoading(false);
  };
  return (
    <>
      {contextHolder}
      <Button onClick={() => setIsModalOpen(true)}>{label}</Button>
      <Modal
        title='Category'
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form
          form={form}
          onFinish={onSubmit}
          layout='vertical'
          name='add-category-form'
          initialValues={initialForm}
          disabled={loading}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item<CategoryFormValue>
                label='Template name'
                name='templateName'
                rules={[
                  { required: true, message: 'Please input template name!' },
                ]}
              >
                <Input placeholder='Recommendation: WebsiteName - Category' />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item<CategoryFormValue>
                label='SKU prefix'
                name='SKUPrefix'
                rules={[
                  { required: true, message: 'Please input SKU prefix!' },
                ]}
              >
                <Input placeholder='Ex: MY_WEBSITE.COM' />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item<CategoryFormValue>
                label='Sale price (USD)'
                name='salePrice'
                rules={[
                  { required: true, message: 'Please input sale price!' },
                ]}
              >
                <Input placeholder='Enter sale price' />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item<CategoryFormValue>
                label='Regular price (USD)'
                name='regularPrice'
                rules={[
                  { required: true, message: 'Please input regular price!' },
                ]}
              >
                <Input placeholder='Enter regular price' />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item<CategoryFormValue>
                name='shopID'
                label='Shop'
                rules={[
                  {
                    required: true,
                    message: 'Please select watermark for website!',
                  },
                ]}
              >
                <Select
                  placeholder='Select Shop'
                  options={watermarkOptions}
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label ?? '')
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item<CategoryFormValue>
                label='Category (Note: accurate 100%)'
                name='category'
                rules={[{ required: true, message: 'Please input category!' }]}
              >
                <Input placeholder='Enter accurate category' />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item<CategoryFormValue>
            name='description'
            label='Description for this category'
          >
            <TextArea rows={4} placeholder='Html content' />
          </Form.Item>

          <Form.Item>
            <Button type='primary' htmlType='submit' loading={loading}>
              Submit
            </Button>
          </Form.Item>
          {error ? <Alert message={error} type='error' /> : null}
        </Form>
      </Modal>
    </>
  );
};

export default UpdateCategoryModal;
