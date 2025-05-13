'use client';
import { Product } from '@/app/(page)/convert-file/ConvertFile';
import { SearchOutlined } from '@ant-design/icons';
import { Button, Card, Col, Input, Modal, Row, Typography } from 'antd';
import Meta from 'antd/es/card/Meta';
import { useMemo, useState } from 'react';
const { Text } = Typography;

interface SearchProductDialogProps {
  product: Product;
  existingProducts: Product[];
}

const SearchProductDialog = ({
  product,
  existingProducts,
}: SearchProductDialogProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [keyword, setKeyword] = useState(product.Name);
  const showModal = () => {
    setIsModalOpen(true);
  };

  const result = useMemo(() => {
    return existingProducts.filter((item) => item.Name.includes(keyword));
  }, [existingProducts, keyword]);

  return (
    <div>
      <SearchOutlined onClick={() => showModal()} />
      <Modal
        title='Search Product'
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        width={'90%'}
        style={{ top: 30 }}
      >
        <Input.Search
          placeholder='input search text'
          enterButton='Search'
          size='large'
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <Row style={{ marginTop: 20 }} gutter={[16, 16]}>
          <Col span={6}>
            <img
              src={product.Images.split(',')[0]}
              alt='product'
              style={{ width: '100%' }}
            />
            <Text>{product.Name}</Text>
          </Col>
          <Col
            span={18}
            style={{
              border: '1px solid #d9d9d9',
              borderRadius: '4px',
              padding: '8px',
            }}
          >
            <SearchResult result={result} />
          </Col>
        </Row>
      </Modal>
    </div>
  );
};

const SearchResult = ({ result }: { result: Product[] }) => {
  return (
    <Row gutter={[16, 16]}>
      {result.map((product) => {
        return (
          <Col
            xl={{ span: 6 }}
            md={{ span: 8 }}
            xs={{ span: 12 }}
            key={product.key}
          >
            <Card
              style={{ maxWidth: 240 }}
              cover={<img alt='product' src={product.Images?.split(',')[0]} />}
            >
              <Meta description={<Text>{product.Name}</Text>} />
            </Card>
          </Col>
        );
      })}
    </Row>
  );
};

export default SearchProductDialog;
