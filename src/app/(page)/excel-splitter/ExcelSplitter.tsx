"use client";
import { useLocalStorage } from "@/app/hooks/useLocalStorage";
import Container from "@/components/commons/Container";
import ProductSorter from "./ProductSorter";
import { normFile } from "@/helper/common";
import { UploadOutlined } from "@ant-design/icons";
import { Button, Card, Form, Input, Upload } from "antd";
import _get from "lodash/get";
import { useEffect, useState } from "react";
import * as XLSX from "xlsx";

const SPLIT_NAME_LOCAL_KEY = "splitName";

const ExcelSplitter = () => {
  const [form] = Form.useForm();
  const [items, setItems] = useState<any[]>([]);
  const [websiteNames, setWebsiteNames] = useLocalStorage(
    SPLIT_NAME_LOCAL_KEY,
    "",
  );

  const handleSubmit = async (values: any) => {
    setWebsiteNames(values.websiteNames);
    const file = values.file;
    const fileOrigin = _get(file[0], "originFileObj") as unknown as File;

    const workbook = XLSX.read(await fileOrigin.arrayBuffer(), {
      type: "array",
    });
    const wordSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = XLSX.utils.sheet_to_json(wordSheet);

    // Ensure each item has a unique id
    const prepared = rawData.map((item: any, index: number) => ({
      ...item,
      id: `item-${index}`,
    }));

    setItems(prepared);
  };

  useEffect(() => {
    if (websiteNames) {
      form.setFieldValue("websiteNames", websiteNames);
    }
  }, [websiteNames]);

  return (
    <>
      <Container
        title="Excel Splitter"
        subtitle="Split Excel files for multiple websites"
        size="lg"
      >
        <Card>
          <Form onFinish={handleSubmit} layout="vertical" form={form}>
            <Form.Item
              label="Website Names"
              name="websiteNames"
              rules={[
                {
                  required: true,
                  message: "Please input website names!",
                },
              ]}
            >
              <Input
                style={{ width: "100%" }}
                placeholder="Website names split by comma"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="file"
              valuePropName="fileList"
              label="Upload File"
              getValueFromEvent={normFile}
              rules={[{ required: true, message: "Please upload file!" }]}
            >
              <Upload beforeUpload={() => false} maxCount={1}>
                <Button icon={<UploadOutlined />} block size="large">
                  Upload Excel
                </Button>
              </Upload>
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" block size="large">
                Load Data
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </Container>
      {items.length > 0 && (
        <ProductSorter items={items} webArray={websiteNames.split(",")} />
      )}
    </>
  );
};

export default ExcelSplitter;
