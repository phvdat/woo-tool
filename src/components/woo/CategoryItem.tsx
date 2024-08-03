import { WooCategoryPayload } from '@/app/api/woo/categories-config/route';
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  DescriptionsProps,
  Flex,
  Popconfirm,
  Row,
  Typography,
  message,
} from 'antd';
import { useState } from 'react';
import UpdateCategory, { TypeUpdateCategory } from './UpdateCategoryModal';
import { handleErrorMongoDB } from '@/helper/common';
import axios from 'axios';
import { endpoint } from '@/constant/endpoint';
import { useCategories } from '@/app/hooks/useCategories';
import { mutate } from 'swr';
const { Text } = Typography;

interface CategoryItem {
  category: WooCategoryPayload;
}

const CategoryItem = ({ category }: CategoryItem) => {
  const items: DescriptionsProps['items'] = [
    {
      key: '1',
      label: 'SKU Prefix',
      children: category.SKUPrefix,
    },
    {
      key: '2',
      label: 'Category',
      children: category.category,
    },
    {
      key: '3',
      label: 'Regular Price',
      children: category.regularPrice,
    },
    {
      key: '4',
      label: 'Sale Price',
      children: category.salePrice,
    },
  ];
  const [messageApi, contextHolder] = message.useMessage();
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleDeleteCategory = async (_id: string) => {
    setLoading(true);
    try {
      await axios.delete(endpoint.categoryConfig, { params: { _id } });
      messageApi.open({
        type: 'success',
        content: 'Delete category successfully!',
      });
      await mutate([endpoint.categoryConfig, '']);
    } catch (error) {
      const { errorMessage } = handleErrorMongoDB(error);
      setError(errorMessage);
    }
    setLoading(false);
  };
  return (
    <>
      {contextHolder}
      <Row key={category._id} style={{ width: '100%' }} gutter={[20, 20]}>
        <Col xs={{ span: 12 }} md={{ span: 8 }}>
          <Text>{category.templateName}</Text>
        </Col>
        <Col xs={{ span: 12 }} md={{ span: 8 }}>
          <Text>{category.category}</Text>
        </Col>
        <Col xs={{ span: 24 }} md={{ span: 8 }}>
          <Flex justify='end' gap={20}>
            <Popconfirm
              title='Delete the category?'
              onConfirm={() => handleDeleteCategory(category._id || '')}
              okText='Yes'
              cancelText='No'
            >
              <Button danger loading={loading}>
                Delete
              </Button>
            </Popconfirm>
            <UpdateCategory
              _id={category._id}
              initialForm={category}
              label={TypeUpdateCategory.EDIT_CATEGORY}
            />
            <UpdateCategory
              _id={category._id}
              initialForm={{
                ...category,
                templateName: `${category.templateName} copy`,
              }}
              label={TypeUpdateCategory.DUPLICATE_CATEGORY}
            />
          </Flex>
        </Col>
      </Row>
      {error ? <Alert message={error} type='error' /> : null}
    </>
  );
};

export default CategoryItem;
