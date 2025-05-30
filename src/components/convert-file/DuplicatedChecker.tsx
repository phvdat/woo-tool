import { Product } from '@/app/(page)/convert-file/ConvertFile';
import { endpoint } from '@/constant/endpoint';
import { getMatchedWordsForBestMatch } from '@/helper/common';
import {
  Button,
  Card,
  Carousel,
  Col,
  Flex,
  Image,
  message,
  Modal,
  Popconfirm,
  Row,
  Spin,
  Tabs,
  TabsProps,
  Typography,
} from 'antd';
import Meta from 'antd/es/card/Meta';
import axios from 'axios';
import { useEffect, useState } from 'react';
import SearchProductDialog from './SearchProductDialog';
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
  const [loading, setLoading] = useState(false);
  const [existingProducts, setExistingProducts] = useState<Product[]>([]);
  const productsSortByName = products.sort((a, b) =>
    a.Name.localeCompare(b.Name)
  );

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const res = await axios.get(endpoint.productData, {
          params: { categories: products[0].Categories },
        });
        const data: Product[] = res.data;
        setExistingProducts(data);
      } catch (error) {
        console.error('Error fetching existing names', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  if (loading) {
    return (
      <Flex justify='center' align='center' style={{ minHeight: '80vh' }}>
        <Spin />
      </Flex>
    );
  }

  return (
    <Row gutter={[16, 16]}>
      {productsSortByName.map((product) => {
        const matchedProduct = getMatchedWordsForBestMatch(
          product.Name,
          existingProducts
        );
        return (
          <Col
            xl={{ span: 4 }}
            lg={{ span: 6 }}
            md={{ span: 8 }}
            xs={{ span: 12 }}
            key={product.key}
          >
            <Card
              hoverable
              style={{ maxWidth: 240 }}
              cover={
                <Carousel>
                  {product.Images.split(',').map((image, index) => (
                    <Image src={image} alt={product.Name} key={index} />
                  ))}
                </Carousel>
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
                    {renderHighlightedName(product.Name, matchedProduct)}
                  </Text>
                }
              />
              <Flex
                justify='space-between'
                align='center'
                style={{ gap: 10, paddingTop: 10 }}
              >
                <SearchProductDialog
                  product={product}
                  name={renderHighlightedName(product.Name, matchedProduct)}
                  existingProducts={existingProducts}
                />

                <Popconfirm
                  title='Delete the Product'
                  description='Are you sure to delete this product?'
                  onConfirm={() => handleDelete(product.key)}
                  okText='Yes'
                  cancelText='No'
                >
                  <Button danger>Delete</Button>
                </Popconfirm>
              </Flex>
            </Card>
          </Col>
        );
      })}
    </Row>
  );
};

function renderHighlightedName(
  name: string,
  matchedProduct: string
): React.ReactNode {
  if (!matchedProduct) {
    return name;
  }
  const parts = name.split(/\s+/);
  const matchedParts = matchedProduct.toLowerCase().split(/\s+/);

  return parts.map((word, index) => {
    const lower = word.toLowerCase();
    const isMatched = matchedParts.includes(lower);
    return (
      <span
        key={index}
        style={{
          fontWeight: isMatched ? 'bold' : 'normal',
          color: isMatched ? 'red' : undefined,
          marginRight: 4,
        }}
      >
        {word}{' '}
      </span>
    );
  });
}
