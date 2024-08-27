'use client';
import { useStore } from '@/app/hooks/store/useStore';
import CategoryItem from '@/components/woo/CategoryItem';
import UpdateCategoryModal, {
  TypeUpdateCategory,
} from '@/components/woo/UpdateCategoryModal';
import { SearchOutlined } from '@ant-design/icons';
import { Flex, Input, List, Typography } from 'antd';
import { useEffect, useState } from 'react';
const { Title } = Typography;

const ConfigCategories = ({ storeId }: { storeId: string }) => {
  const [searchValue, setSearchValue] = useState('');
  const { store, isLoading } = useStore(storeId);

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
        dataSource={store?.categories}
        renderItem={(item) => (
          <List.Item>
            <CategoryItem
              key={item._id}
              categoryName={item.categoryName}
              _id={item._id}
              _storeId={storeId}
            />
          </List.Item>
        )}
      />
      <UpdateCategoryModal
        label={TypeUpdateCategory.ADD_CATEGORY}
        storeId={storeId}
      />
    </Flex>
  );
};

export default ConfigCategories;
