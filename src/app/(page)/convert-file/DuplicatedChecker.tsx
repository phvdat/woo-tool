import {
  Button,
  Card,
  Col,
  Modal,
  Popconfirm,
  Row,
  Tabs,
  TabsProps,
} from 'antd';
import Meta from 'antd/es/card/Meta';
import { useState } from 'react';
import { Product } from './ConvertFile';

interface DuplicatedCheckerProps {
  products: Product[];
  handleDelete: (index: string) => void;
}

const DuplicatedChecker = ({
  products,
  handleDelete,
}: DuplicatedCheckerProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const categoriesList: string[] = Array.from(
    new Set(products.map((product) => product.Categories))
  );

  const tabItems: TabsProps['items'] = categoriesList.map((category) => ({
    key: category,
    label: category.split('>').pop()?.toString(),
    children: (
      <ProductGallery
        products={products.filter((product) => product.Categories === category)}
        handleDelete={handleDelete}
      />
    ),
  }));

  return (
    <div>
      <Button type='primary' onClick={() => setIsModalOpen(true)}>
        Duplicated Checker
      </Button>
      <Modal
        width={'100%'}
        style={{ top: 20 }}
        title='Duplicated Checker'
        open={isModalOpen}
        footer={null}
        onCancel={() => setIsModalOpen(false)}
      >
        <Tabs defaultActiveKey='1' items={tabItems} />
      </Modal>
    </div>
  );
};

export default DuplicatedChecker;

const ProductGallery = ({
  products,
  handleDelete,
}: {
  products: Product[];
  handleDelete: (index: string) => void;
}) => {
  const productsSortByName = products.sort((a, b) =>
    a.Name.localeCompare(b.Name)
  );
  return (
    <Row gutter={[16, 16]}>
      {productsSortByName.map((product) => (
        <Col
          xl={{ span: 6 }}
          md={{ span: 8 }}
          xs={{ span: 12 }}
          key={product.key}
        >
          <Popconfirm
            title='Delete the Product'
            description='Are you sure to delete this product?'
            onConfirm={() => handleDelete(product.key)}
            okText='Yes'
            cancelText='No'
          >
            <Card
              hoverable
              style={{ width: 240 }}
              cover={<img alt='product' src={product.Images.split(',')[0]} />}
            >
              <Meta description={product.Name} />
            </Card>
          </Popconfirm>
        </Col>
      ))}
    </Row>
  );
};
