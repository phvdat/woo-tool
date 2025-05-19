import { Product } from '@/app/(page)/convert-file/ConvertFile';
import { endpoint } from '@/constant/endpoint';
import {
  Button,
  Card,
  Col,
  message,
  Modal,
  Popconfirm,
  Row,
  Tabs,
  TabsProps,
  Typography,
} from 'antd';
import Meta from 'antd/es/card/Meta';
import axios from 'axios';
import { useEffect, useState } from 'react';
import SearchProductDialog from './SearchProductDialog';
import { getMatchedWordsForBestMatch } from '@/helper/common';
const { Text } = Typography;

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
  ).sort((a, b) => {
    const cateA = a.split('>').pop();
    const cateB = b.split('>').pop();
    if (!cateA) return 1;
    if (!cateB) return -1;
    return cateA && cateB ? cateA.localeCompare(cateB) : 0;
  });

  const tabItems: TabsProps['items'] = categoriesList.map((category) => ({
    key: category,
    label: category?.split('>').pop()?.toString() || 'MISSING CATEGORY',
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
  const [existingProducts, setExistingProducts] = useState<Product[]>([]);
  const productsSortByName = products.sort((a, b) =>
    a.Name.localeCompare(b.Name)
  );

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await axios.get(endpoint.productData, {
          params: { categories: products[0].Categories },
        });
        const data: Product[] = res.data;
        setExistingProducts(data);
      } catch (error) {
        console.error('Error fetching existing names', error);
      }
    };
    fetchProducts();
  }, []);

  return (
    <Row gutter={[16, 16]}>
      {productsSortByName.map((product) => {
        const matchedWords = getMatchedWordsForBestMatch(
          product.Name,
          existingProducts
        );
        return (
          <Col
            xl={{ span: 6 }}
            md={{ span: 8 }}
            xs={{ span: 12 }}
            key={product.key}
          >
            <Card
              hoverable
              style={{ maxWidth: 240 }}
              cover={
                <Popconfirm
                  title='Delete the Product'
                  description='Are you sure to delete this product?'
                  onConfirm={() => handleDelete(product.key)}
                  okText='Yes'
                  cancelText='No'
                >
                  <img alt='product' src={product.Images?.split(',')[0]} />
                </Popconfirm>
              }
            >
              <Meta
                description={
                  <Text
                    onClick={() => {
                      navigator.clipboard.writeText(product.Name);
                      message.success('Copy successfully');
                    }}
                  >
                    {renderHighlightedName(product.Name, matchedWords)}
                  </Text>
                }
              />
              <SearchProductDialog
                product={product}
                name={renderHighlightedName(product.Name, matchedWords)}
                existingProducts={existingProducts}
              />
            </Card>
          </Col>
        );
      })}
    </Row>
  );
};

function renderHighlightedName(
  name: string,
  matchedWords: string[]
): React.ReactNode {
  const parts = name.split(/\s+/);

  return parts.map((word, index) => {
    const lower = word.toLowerCase();
    const isMatched = matchedWords.includes(lower);
    return (
      <span
        key={index}
        style={{
          fontWeight: isMatched ? 'bold' : 'normal',
          backgroundColor: isMatched ? 'rgba(255, 215, 0, 0.3)' : undefined,
          marginRight: 4,
        }}
      >
        {word}{' '}
      </span>
    );
  });
}
