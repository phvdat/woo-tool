'use client';
import { Product } from '@/app/(page)/convert-file/ConvertFile';
import { SearchOutlined } from '@ant-design/icons';
import { Button, Card, Col, Image, Input, Modal, Row, Typography } from 'antd';
import Meta from 'antd/es/card/Meta';
import { useMemo, useState } from 'react';
const { Text } = Typography;

interface SearchProductDialogProps {
  product: Product;
  existingProducts: Product[];
  name: React.ReactNode;
}

const SearchProductDialog = ({
  product,
  existingProducts,
  name,
}: SearchProductDialogProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [keyword, setKeyword] = useState(product.Name);
  const showModal = () => {
    setIsModalOpen(true);
  };

  const result = useMemo(() => {
    return existingProducts.filter((item) =>
      item.Name.toLowerCase().includes(keyword.toLowerCase())
    );
  }, [existingProducts, keyword]);

  return (
    <div>
      <Button block onClick={() => showModal()}>
        <SearchOutlined />
      </Button>
      <Modal
        title='Search Product'
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        width={'90%'}
        style={{ top: 30 }}
      >
        <Input
          placeholder='input search text'
          size='large'
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <Row style={{ marginTop: 20 }} gutter={[16, 16]}>
          <Col xs={{ span: 12 }} lg={{ span: 6 }}>
            <Image
              src={product.Images?.split(',')[0]}
              alt='product'
              style={{ width: '100%' }}
            />
            <Text>{name}</Text>
          </Col>
          <Col
            xs={{ span: 12 }}
            lg={{ span: 18 }}
            style={{
              border: '1px solid #d9d9d9',
              borderRadius: '4px',
              padding: '8px',
              maxHeight: '80vh',
              overflowY: 'auto',
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
            xl={{ span: 8 }}
            md={{ span: 12 }}
            xs={{ span: 24 }}
            key={product.key}
          >
            <Card
              style={{ maxWidth: 240 }}
              cover={
                <Image alt='product' src={product.Images?.split(',')[0]} />
              }
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
