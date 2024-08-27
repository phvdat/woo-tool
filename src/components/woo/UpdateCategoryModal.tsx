'use client';
import { useCategory } from '@/app/hooks/store/useCategory';
import { endpoint } from '@/constant/endpoint';
import { handleErrorMongoDB } from '@/helper/common';
import { WooFixedOption } from '@/helper/woo';
import { Alert, Button, Form, Input, Modal, message } from 'antd';
import TextArea from 'antd/es/input/TextArea';
import axios from 'axios';
import { useEffect, useState } from 'react';
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
  _id?: string;
  label: TypeUpdateCategory;
  storeId?: string;
}

const UpdateCategoryModal = ({ _id, label, storeId }: UpdateCategoryProps) => {
  const [messageApi, contextHolder] = message.useMessage();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm<CategoryFormValue>();
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const { category } = useCategory(_id as string);

  const createCategory = async (values: CategoryFormValue, storeId: string) => {
    const payload = {
      ...values,
      storeId,
    };
    try {
      await axios.post(endpoint.categoryConfig, payload);
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

  const updateCategory = async (
    _id: string,
    values: CategoryFormValue,
    _storeId: string
  ) => {
    try {
      const payload = { _id, ...values, _storeId };
      await axios.put(endpoint.categoryConfig, payload);
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
      await updateCategory(_id, values, storeId as string);
    } else {
      await createCategory(values, storeId as string);
    }
    await mutate(`${endpoint.store}/${storeId}`);
    setLoading(false);
  };
  useEffect(() => {
    if (category) {
      form.setFieldsValue(category);
    }
  }, [category, form]);
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
          disabled={loading}
        >
          <Form.Item<CategoryFormValue>
            label='Template name'
            name='templateName'
            rules={[{ required: true, message: 'Please input template name!' }]}
          >
            <Input placeholder='Recommendation: WebsiteName - Category' />
          </Form.Item>

          <Form.Item<CategoryFormValue>
            label='SKU prefix'
            name='SKUPrefix'
            rules={[{ required: true, message: 'Please input SKU prefix!' }]}
          >
            <Input placeholder='Ex: MY_WEBSITE.COM' />
          </Form.Item>

          <Form.Item<CategoryFormValue>
            label='Sale price'
            name='salePrice'
            rules={[{ required: true, message: 'Please input sale price!' }]}
          >
            <Input placeholder='Enter sale price' />
          </Form.Item>

          <Form.Item<CategoryFormValue>
            label='Regular price'
            name='regularPrice'
            rules={[{ required: true, message: 'Please input regular price!' }]}
          >
            <Input placeholder='Enter regular price' />
          </Form.Item>

          <Form.Item<CategoryFormValue>
            label='Category (Note: accurate 100%)'
            name='category'
            rules={[{ required: true, message: 'Please input category!' }]}
          >
            <Input placeholder='Enter accurate category' />
          </Form.Item>
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
