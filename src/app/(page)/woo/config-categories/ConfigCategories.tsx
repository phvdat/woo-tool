'use client';
import { useCategories } from '@/app/hooks/useCategories';
import CategoryItem from '@/components/woo/CategoryItem';
import UpdateCategory from '@/components/woo/UpdateCategory';
import { Row, Typography } from 'antd';

const ConfigCategories = () => {
  const { categories } = useCategories();
  return (
    <div>
      <h1>Config Categories</h1>
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
