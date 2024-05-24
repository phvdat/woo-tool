'use client';
import { useCategories } from '@/app/hooks/useCategories';
import CategoryItem from '@/components/woo/CategoryItem';
import UpdateCategory from '@/components/woo/UpdateCategory';
import { Flex, Row, Spin, Typography } from 'antd';
const { Title } = Typography;

const ConfigCategories = () => {
  const { categories, isLoading } = useCategories();
  return (
    <div>
      <Title level={4}>Config Categories</Title>
      {isLoading ? (
        <Flex justify='center'>
          <Spin />
        </Flex>
      ) : null}
      <Row gutter={[20, 20]} style={{ marginBottom: 20 }}>
        {categories
          ? categories.map((category) => (
              <CategoryItem key={category._id} category={category} />
            ))
          : null}
      </Row>
      <UpdateCategory />
    </div>
  );
};

export default ConfigCategories;
