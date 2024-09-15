'use client';
import { useCategories } from '@/app/hooks/useCategories';
import { useWatermarkConfig } from '@/app/hooks/useWatermarkConfig';
import CategoryItem from '@/components/woo/CategoryItem';
import UpdateCategory, {
  TypeUpdateCategory,
} from '@/components/woo/UpdateCategoryModal';
import { SearchOutlined } from '@ant-design/icons';
import { Flex, Input, List, Row, Spin, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { useDebounceValue } from 'usehooks-ts';
const { Title } = Typography;

const ConfigCategories = () => {
  const [searchValue, setSearchValue] = useState('');
  const debouncedValue = useDebounceValue(searchValue, 500);
  const { categories, isLoading } = useCategories(debouncedValue[0]);

  useEffect;
  return (
    <Flex gap={20} vertical style={{ marginTop: 24 }}>
      <Input
        placeholder='Search category'
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        style={{ maxWidth: 300 }}
        prefix={<SearchOutlined />}
      />
      <List
        loading={isLoading}
        header={
          <Title level={4} style={{ textAlign: 'center' }}>
            Config Categories
          </Title>
        }
        bordered
        dataSource={categories}
        renderItem={(item) => (
          <List.Item>
            <CategoryItem key={item._id} category={item} />
          </List.Item>
        )}
      />
      <UpdateCategory label={TypeUpdateCategory.ADD_CATEGORY} />
    </Flex>
  );
};

export default ConfigCategories;
