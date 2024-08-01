'use client';
import { useCategories } from '@/app/hooks/useCategories';
import { endpoint } from '@/constant/endpoint';
import { handleErrorMongoDB } from '@/helper/common';
import { WooFixedOption } from '@/helper/woo';
import { Alert, Button, Form, Input, Modal, message } from 'antd';
import TextArea from 'antd/es/input/TextArea';
import axios from 'axios';
import { useState } from 'react';

export interface CategoryFormValue extends WooFixedOption {
  templateName: string;
  pathnameImage: string;
}

interface AddNewCategoryProps {
  initialForm?: CategoryFormValue;
  _id?: string;
}

const UpdateCategory = ({ initialForm, _id }: AddNewCategoryProps) => {
  const { mutate } = useCategories();
  const [messageApi, contextHolder] = message.useMessage();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm<CategoryFormValue>();
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const createCategory = async (values: CategoryFormValue) => {
    try {
      await axios.post(endpoint.categoryConfig, values);
      messageApi.open({
        type: 'success',
        content: 'Create category successfully!',
      });
      await mutate();
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
      await mutate();
      setIsModalOpen(false);
    } catch (error) {
      const { errorMessage } = handleErrorMongoDB(error);
      setError(errorMessage);
    }
  };

  const onSubmit = async (values: CategoryFormValue) => {
    setLoading(true);
    setError('');
    if (_id) {
      await updateCategory(_id, values);
    } else {
      await createCategory(values);
    }
    setLoading(false);
  };
  return (
    <>
      {contextHolder}
      <Button onClick={() => setIsModalOpen(true)}>
        {_id ? 'Edit' : 'Add new Category'}
      </Button>
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
            label='Pathname Image'
            name='pathnameImage'
            rules={[
              { required: true, message: 'Please input pathname image!' },
            ]}
          >
            <Input placeholder='Ex: https://domain.com' />
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

export default UpdateCategory;
