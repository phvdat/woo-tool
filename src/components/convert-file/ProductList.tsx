"use client";

import ProductItemComponent from "@/components/convert-file/ProductItem";
import ExistChecker from "@/components/convert-file/ExistChecker";
import ExcludeSizeChartLink from "@/components/convert-file/ExcludeSizeChartLink";
import { DeleteOutlined, DownloadOutlined, FileSearchOutlined } from "@ant-design/icons";
import { Button, Flex, message, Switch, Typography } from "antd";
import { FixedSizeList as List } from "react-window";
import { useCallback, useMemo } from "react";

const { Text } = Typography;

const ROW_HEIGHT = 320;

export interface Product {
  key: string;
  Name: string;
  Images: string;
  Categories: string;
  [key: string]: any;
}

interface ProductListProps {
  products: Product[];
  searchProduct: Product[] | null;
  onSearchProduct: (products: Product[] | null) => void;
  onDeleteProduct: (key: string) => void;
  onSetProducts: (products: Product[] | ((prev: Product[]) => Product[])) => void;
  categoriesOptions: { label: string; value: string }[];
  onNameChange: (key: string, value: string) => void;
  onCategoryChange: (key: string, value: string) => void;
  onImagesChange: (key: string, value: string) => void;
  onDuplicateRow: (key: string) => void;
  onSplitProduct: (key: string, count: number) => void;
  onMergeProduct: (targetKey: string) => void;
  mergeSourceKey: string | null;
  onSetMergeSourceKey: React.Dispatch<React.SetStateAction<string | null>>;
  onSubmit: () => void;
  uploadAble: boolean;
  onSetUploadAble: (value: boolean) => void;
}

export default function ProductList({
  products,
  searchProduct,
  onSearchProduct,
  onDeleteProduct,
  onSetProducts,
  categoriesOptions,
  onNameChange,
  onCategoryChange,
  onImagesChange,
  onDuplicateRow,
  onSplitProduct,
  onMergeProduct,
  mergeSourceKey,
  onSetMergeSourceKey,
  onSubmit,
  uploadAble,
  onSetUploadAble,
}: ProductListProps) {
  const handleCheckDuplicate = useCallback(() => {
    const nameMap: Record<string, number> = {};
    products.forEach((product) => {
      const normalizedName = product.Name.trim().toLowerCase();
      nameMap[normalizedName] = (nameMap[normalizedName] || 0) + 1;
    });
    const duplicateNames = Object.keys(nameMap).filter((name) => nameMap[name] > 1);
    if (duplicateNames.length > 0) {
      message.error(duplicateNames[0]);
    } else {
      message.success("No duplicate names found");
    }
  }, [products]);

  const displayProducts = searchProduct || products;

  const itemData = useMemo(
    () => ({
      products: displayProducts,
      handleNameChange: onNameChange,
      handleCategoryChange: onCategoryChange,
      handleDelete: onDeleteProduct,
      categoriesOptions,
      handleImagesChange: onImagesChange,
      handleDuplicateRow: onDuplicateRow,
      setProducts: onSetProducts,
      mergeSourceKey,
      setMergeSourceKey: onSetMergeSourceKey,
      handleMergeProduct: onMergeProduct,
      handleSplitProduct: onSplitProduct,
    }),
    [
      displayProducts,
      onNameChange,
      onCategoryChange,
      onDeleteProduct,
      categoriesOptions,
      onImagesChange,
      onDuplicateRow,
      onSetProducts,
      mergeSourceKey,
      onSetMergeSourceKey,
      onMergeProduct,
      onSplitProduct,
    ],
  );

  const Row = useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => (
      <ProductItemComponent
        index={index}
        style={style}
        data={itemData}
      />
    ),
    [itemData],
  );

  return (
    <div>
      <Flex gap={12} justify="flex-end" style={{ marginBottom: 16 }}>
        <ExistChecker products={products} handleDelete={onDeleteProduct} />
        <Button onClick={handleCheckDuplicate} icon={<FileSearchOutlined />} />
        <ExcludeSizeChartLink products={products} setProducts={onSetProducts} />
        <Button danger onClick={() => onSetProducts([])} style={{ marginLeft: 16 }}>
          <DeleteOutlined /> {products.length} items
        </Button>
      </Flex>

      <div
        style={{
          height: 600,
          border: "1px solid #E5E7EB",
          borderRadius: 8,
          overflow: "auto",
        }}
      >
        <List
          height={600}
          itemCount={displayProducts.length}
          itemSize={ROW_HEIGHT}
          width="100%"
          itemData={itemData}
        >
          {Row}
        </List>
      </div>

      <Flex gap={16} align="center" justify="space-between" style={{ marginTop: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Text>Upload to server:</Text>
          <Switch value={uploadAble} onChange={onSetUploadAble} />
        </div>
        <Button type="primary" icon={<DownloadOutlined />} onClick={onSubmit}>
          Download ({products.length} items)
        </Button>
      </Flex>
    </div>
  );
}
