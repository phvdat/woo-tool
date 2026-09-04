"use client";

import { useGlobalCateKeywordConfig } from "@/app/hooks/useGlobalCateKeywordConfig";
import { useLocalStorage } from "@/app/hooks/useLocalStorage";
import Container from "@/components/commons/Container";
import EmptyState from "@/components/commons/EmptyState";
import FileUploader from "@/components/convert-file/FileUploader";
import ProductList from "@/components/convert-file/ProductList";
import { endpoint } from "@/constant/endpoint";
import { handleDownloadFile } from "@/helper/woo";
import { message } from "antd";
import axios from "axios";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import { useMediaQuery } from "usehooks-ts";

export const CONVERT_DATA = "CONVERT_DATA";

export interface Product {
  key: string;
  Name: string;
  Images: string;
  Categories: string;
  Link?: string;
  [key: string]: any;
}

export default function ConvertFile() {
  const { data: session } = useSession();
  const [form] = (require("antd")).Form.useForm();
  const { cateKeyword } = useGlobalCateKeywordConfig();

  const [products, setProducts] = useLocalStorage<Product[]>(CONVERT_DATA, []);
  const [searchProduct, setSearchProduct] = useState<Product[] | null>(null);
  const [uploadAble, setUploadable] = useState(true);
  const [mergeSourceKey, setMergeSourceKey] = useState<string | null>(null);

  const categoriesOptions = useMemo(() => {
    const allCates = products.map((p) => p.Categories?.trim() || "Missing Cate");
    const unique = Array.from(new Set(allCates)).sort();
    return unique.map((c) => ({ label: c, value: c }));
  }, [products]);

  const updateBoth = (updater: (list: Product[]) => Product[]) => {
    setProducts((prev) => updater(prev));
    setSearchProduct((prev) => (prev ? updater(prev) : prev));
  };

  const handleProductsLoaded = (newProducts: Product[]) => {
    setProducts((prev) => [...prev, ...newProducts]);
  };

  const handleSearch = (value: string) => {
    if (!value) {
      setSearchProduct(null);
      return;
    }
    const filtered = products.filter(
      (p) =>
        p.Name.toLowerCase().includes(value.toLowerCase()) ||
        p.Categories.toLowerCase().includes(value.toLowerCase())
    );
    setSearchProduct(filtered);
  };

  const handleCategoryFilter = (category: string) => {
    if (category === "All Cate") {
      setSearchProduct(null);
      return;
    }
    setSearchProduct(
      products.filter((p) => {
        const cat = p.Categories?.trim() || "Missing Cate";
        return cat === category;
      })
    );
  };

  const handleNameChange = (key: string, value: string) => {
    updateBoth((list) => list.map((p) => (p.key === key ? { ...p, Name: value } : p)));
  };

  const handleCategoryChange = (key: string, value: string) => {
    updateBoth((list) => list.map((p) => (p.key === key ? { ...p, Categories: value } : p)));
  };

  const handleImagesChange = (key: string, value: string) => {
    updateBoth((list) => list.map((p) => (p.key === key ? { ...p, Images: value } : p)));
  };

  const handleDelete = (key: string) => {
    updateBoth((list) => list.filter((p) => p.key !== key));
  };

  const handleDuplicateRow = (key: string) => {
    const index = products.findIndex((p) => p.key === key);
    if (index === -1) return;
    const newList = [
      ...products.slice(0, index + 1),
      { ...products[index], key: products[index].key + Date.now() },
      ...products.slice(index + 1),
    ];
    setProducts(newList);
  };

  const handleSplitProduct = (key: string, splitCount: number) => {
    setProducts((prev) => {
      const newList: Product[] = [];
      prev.forEach((product) => {
        if (product.key === key) {
          const imageArray = product.Images.split(",");
          const totalChunks = Math.ceil(imageArray.length / splitCount);
          for (let i = 0; i < totalChunks; i++) {
            const chunk = imageArray.slice(i * splitCount, (i + 1) * splitCount);
            newList.push({
              ...product,
              Name: i === 0 ? product.Name : `${product.Name} Ver${i + 1}`,
              Images: chunk.join(","),
              key: `${product.key}-${i}`,
            });
          }
        } else {
          newList.push(product);
        }
      });
      return newList;
    });
    setSearchProduct(null);
  };

  const handleMergeProduct = (targetKey: string) => {
    if (!mergeSourceKey || mergeSourceKey === targetKey) {
      setMergeSourceKey(null);
      return;
    }
    updateBoth((list) => {
      const source = list.find((p) => p.key === mergeSourceKey);
      const target = list.find((p) => p.key === targetKey);
      if (!source || !target) return list;
      const mergedImages = [...source.Images.split(","), ...target.Images.split(",")];
      return list
        .map((p) => {
          if (p.key === mergeSourceKey) {
            return { ...p, Images: Array.from(new Set(mergedImages)).join(",") };
          }
          return p;
        })
        .filter((p) => p.key !== targetKey);
    });
    setMergeSourceKey(null);
  };

  const handleSubmit = async () => {
    const isCategoryValid = products.every((p) => p.Categories);
    if (!isCategoryValid) {
      message.error("Please fill all categories");
      return;
    }
    handleDownloadFile(products, "Converted");

    if (uploadAble) {
      try {
        const email = session?.user?.email;
        if (!email) {
          message.error("Missing user email");
          return;
        }
        const payload = products.map((p) => ({ ...p, email, createdAt: new Date() }));
        await axios.post(endpoint.productData, payload);
        message.success("Products uploaded successfully");
      } catch {
        message.error("Error uploading products");
      }
    }
  };

  return (
    <Container
      title="Convert File"
      subtitle="Import and convert product data from Excel files"
      size="lg"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <FileUploader
          form={form}
          products={products}
          onProductsLoaded={handleProductsLoaded}
          onSearch={handleSearch}
          onCategoryFilter={handleCategoryFilter}
        />

        {products.length > 0 ? (
          <ProductList
            products={products}
            searchProduct={searchProduct}
            onSearchProduct={setSearchProduct}
            onDeleteProduct={handleDelete}
            onSetProducts={setProducts}
            categoriesOptions={categoriesOptions}
            onNameChange={handleNameChange}
            onCategoryChange={handleCategoryChange}
            onImagesChange={handleImagesChange}
            onDuplicateRow={handleDuplicateRow}
            onSplitProduct={handleSplitProduct}
            onMergeProduct={handleMergeProduct}
            mergeSourceKey={mergeSourceKey}
            onSetMergeSourceKey={setMergeSourceKey}
            onSubmit={handleSubmit}
            uploadAble={uploadAble}
            onSetUploadAble={setUploadable}
          />
        ) : (
          <EmptyState
            title="No products loaded"
            description="Upload an Excel file to start converting products"
          />
        )}
      </div>
    </Container>
  );
}
