'use client';
import { useCategories } from '@/app/hooks/useCategories';
import { useConfigWebsite } from '@/app/hooks/useConfigWebsite';
import CategoryItem from '@/components/woo/CategoryItem';
import UpdateCategory, {
  TypeUpdateCategory,
} from '@/components/woo/UpdateCategoryModal';
import { Flex, List, Radio, Typography } from 'antd';
import { useSession } from 'next-auth/react';
import { useState } from 'react';
const { Title } = Typography;

const ConfigCategories = () => {
  const { data } = useSession();
  const [webSite, setWebSite] = useState('');
  const { categories, isLoading, mutate } = useCategories(webSite);
  const { websiteConfigList } = useConfigWebsite(data?.user?.email || '');
  const options =
    websiteConfigList?.map((item) => ({
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
        dataSource={categories.sort((a, b) =>
          a.category.localeCompare(b.category)
        )}
        renderItem={(item) => (
          <List.Item>
            <CategoryItem
              key={item._id}
              category={item}
              accessAble={webSite !== ''}
              refresh={mutate}
            />
          </List.Item>
        )}
      />
      <UpdateCategory
        label={TypeUpdateCategory.ADD_CATEGORY}
        refresh={mutate}
      />
    </Flex>
  );
};

export default ConfigCategories;
