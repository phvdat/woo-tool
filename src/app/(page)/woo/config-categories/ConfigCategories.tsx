'use client';
import { useCategories } from '@/app/hooks/useCategories';
import { useWatermarkConfig } from '@/app/hooks/useWatermarkConfig';
import CategoryItem from '@/components/woo/CategoryItem';
import UpdateCategory, {
  TypeUpdateCategory,
} from '@/components/woo/UpdateCategoryModal';
import { Flex, List, Radio, Typography } from 'antd';
import { useState } from 'react';
const { Title } = Typography;

const ConfigCategories = () => {
  const [webSite, setWebSite] = useState('');
  const { categories, isLoading } = useCategories(webSite);
  const { watermarkConfig } = useWatermarkConfig();
  const options =
    watermarkConfig?.map((item) => ({
      label: item.shopName,
      value: item._id as string,
    })) || [];

  return (
    <Flex gap={20} vertical style={{ marginTop: 24 }}>
      <Radio.Group
        options={[{ label: 'All', value: '' }, ...options]}
        defaultValue=''
        optionType='button'
        buttonStyle='solid'
        onChange={(e) => setWebSite(e.target.value)}
        style={{ textAlign: 'center' }}
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
