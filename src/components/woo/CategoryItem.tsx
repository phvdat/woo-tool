import { WooCategoryPayload } from '@/app/api/woo/categories-config/route';
import { useConfigWebsite } from '@/app/hooks/useConfigWebsite';
import { endpoint } from '@/constant/endpoint';
import { handleErrorMongoDB } from '@/helper/common';
import {
  Alert,
  Button,
  Col,
  Flex,
  Popconfirm,
  Row,
  Typography,
  message,
} from 'antd';
import axios from 'axios';
import { useState } from 'react';
import { mutate } from 'swr';
import UpdateCategory, { TypeUpdateCategory } from './UpdateCategoryModal';
const { Text } = Typography;

interface CategoryItem {
  category: WooCategoryPayload;
  accessAble: boolean;
  refresh: () => void;
}

const CategoryItem = ({ category, accessAble, refresh }: CategoryItem) => {
  const [messageApi, contextHolder] = message.useMessage();
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const { websiteConfigList } = useConfigWebsite();

  const shop = websiteConfigList?.find(
    (website) => website._id === category.shopID
  );
  const handleDeleteCategory = async (_id: string) => {
    setLoading(true);
    try {
      await axios.delete(endpoint.categoryConfig, { params: { _id } });
      messageApi.open({
        type: 'success',
        content: 'Delete category successfully!',
      });
      refresh();
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
        <Col xs={{ span: 8 }} lg={{ span: 6 }}>
          <Text>{category.templateName}</Text>
        </Col>
        <Col xs={{ span: 8 }} lg={{ span: 6 }}>
          <Text>{category.category}</Text>
        </Col>
        <Col xs={{ span: 8 }} lg={{ span: 6 }}>
          <Text>{shop?.shopName}</Text>
        </Col>
        <Col xs={{ span: 24 }} lg={{ span: 6 }}>
          <Flex justify='end' gap={20}>
            {accessAble ? (
              <>
                <Popconfirm
                  title='Delete the category?'
                  onConfirm={() => handleDeleteCategory(category._id || '')}
                  okText='Yes'
                  cancelText='No'
                >
                  <Button danger loading={loading} type='primary'>
                    Delete
                  </Button>
                </Popconfirm>
                <UpdateCategory
                  _id={category._id}
                  initialForm={category}
                  label={TypeUpdateCategory.EDIT_CATEGORY}
                  refresh={refresh}
                />
              </>
            ) : null}

            <UpdateCategory
              _id={category._id}
              initialForm={{
                ...category,
                templateName: `${category.templateName} copy`,
              }}
              label={TypeUpdateCategory.DUPLICATE_CATEGORY}
              refresh={refresh}
            />
          </Flex>
        </Col>
      </Row>
      {error ? <Alert message={error} type='error' /> : null}
    </>
  );
};

export default CategoryItem;
