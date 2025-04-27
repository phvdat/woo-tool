'use client';

import { useCategories } from '@/app/hooks/useCategories';
import { useConfigWebsite } from '@/app/hooks/useConfigWebsite';
import { CATE_KEYWORD_LOCAL_KEY } from '@/components/convert-file/CateKeywordConfig';
import InitialFileTable from '@/components/create-initial-file/InitialFileTable';
import { convertToAcronym } from '@/helper/common';
import detectCategory from '@/helper/detect-category';
import { handleDownloadFile } from '@/helper/woo';
import {
  CopyOutlined,
  DownloadOutlined,
  RollbackOutlined,
} from '@ant-design/icons';
import {
  Button,
  Col,
  Form,
  Input,
  message,
  Row,
  Select,
  Spin,
  Table,
} from 'antd';
import _capitalize from 'lodash/capitalize';
import { useEffect, useMemo, useState } from 'react';
import { useLocalStorage } from 'usehooks-ts';

const INITIAL_DATA = 'INITIAL_DATA';

export interface InitialFileValues {
  Name: string;
  Images: string;
  Categories: string;
  website: string;
}

const InitialFile = () => {
  const [form] = Form.useForm();
  const { websiteConfigList, isLoading: websiteLoading } = useConfigWebsite();
  const { categories, isLoading: categoriesLoading } = useCategories();
  const [dataFile, setDataFile] = useState<
    Omit<InitialFileValues, 'website'>[]
  >([]);
  const [cateKeyword] = useLocalStorage<{
    [key: string]: string[];
  }>(CATE_KEYWORD_LOCAL_KEY, {});
  const [dataLocal, setDataLocal] = useLocalStorage(INITIAL_DATA, '[]');
  const watchShopId = Form.useWatch('website', form);

  const categoriesOptions = useMemo(() => {
    const categoriesByShop = categories?.filter(
      (category) => category.shopID === watchShopId
    );
    if (!categoriesByShop) return [];
    return categoriesByShop.map((category) => ({
      label: category.templateName,
      value: category.category,
    }));
  }, [categories, watchShopId]);

  const websiteOptions = useMemo(() => {
    if (!websiteConfigList) return [];
    return websiteConfigList.map((website) => ({
      label: website.shopName,
      value: website._id,
    }));
  }, [websiteConfigList]);

  const handlePasteName = () => {
    navigator.clipboard.readText().then((text) => {
      const name = text.replace(/\n/g, '').trim();
      form.setFieldValue('Name', name);
      const category = detectCategory(name, cateKeyword);
      form.setFieldValue('Categories', category);
    });
  };

  const handlePasteImages = () => {
    navigator.clipboard.readText().then((text) => {
      const currentImages = form.getFieldValue('Images') || '';
      form.setFieldValue(
        'Images',
        currentImages ? `${currentImages},${text}` : text
      );
    });
  };

  const setPrevCategory = () => {
    const prevCategory = dataFile[dataFile.length - 1]?.Categories || '';
    form.setFieldValue('Categories', prevCategory);
  };

  const handleSubmit = async (values: InitialFileValues) => {
    const { website, ...data } = values;
    const name = data.Name.replace(/\n/g, '').trim();
    const isExistProductName = dataFile.find((item) => item.Name === name);
    if (isExistProductName) {
      message.error('Product name already exist!');
    } else {
      setDataFile((prev) => [...prev, data]);
      setDataLocal(JSON.stringify([...dataFile, data]));
      form.setFieldValue('Name', '');
      form.setFieldValue('Images', '');
      form.setFieldValue('Categories', '');
      message.success('Product added successfully!');
    }
  };

  const removeRecordByName = (name: string) => {
    setDataFile((prev) => prev.filter((item) => item.Name !== name));
  };

  useEffect(() => {
    setDataFile(JSON.parse(dataLocal) || []);
  }, []);

  return (
    <div>
      <div style={{ padding: '20px', maxWidth: '1000px', margin: 'auto' }}>
        <Form
          name='initial-file'
          onFinish={handleSubmit}
          layout='vertical'
          form={form}
        >
          {(categoriesLoading || websiteLoading) && (
            <Spin
              size='large'
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                zIndex: 100,
                transform: 'translateX(-50%)',
              }}
            />
          )}
          <Row gutter={16}>
            <Col span={24} sm={{ span: 12 }}>
              <Form.Item<InitialFileValues>
                name='website'
                label='Website'
                rules={[
                  {
                    required: true,
                    message: 'Please select for website!',
                  },
                ]}
              >
                <Select
                  placeholder='Select Website'
                  options={websiteOptions}
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label ?? '')
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }
                />
              </Form.Item>
            </Col>
            <Col span={24} sm={{ span: 12 }}>
              <Form.Item<InitialFileValues>
                name='Categories'
                label={
                  <span style={{ color: 'red' }}>
                    Select Category (Be cautious)
                  </span>
                }
                rules={[{ required: true, message: 'Please select category!' }]}
              >
                <Select
                  placeholder='Select Category'
                  options={categoriesOptions}
                  suffixIcon={
                    <RollbackOutlined
                      autoCapitalize=''
                      onClick={setPrevCategory}
                      style={{
                        fontSize: '20px',
                        padding: '2px 12px',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                      }}
                    />
                  }
                  showSearch
                  filterOption={(input, option) => {
                    const searchFull = (option?.label ?? '')
                      .toLowerCase()
                      .includes(input.toLowerCase());
                    const searchAcronym = convertToAcronym(
                      option?.label ?? ''
                    ).includes(input.toLowerCase());
                    console.log(convertToAcronym(option?.label ?? ''));
                    return searchFull || searchAcronym;
                  }}
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item<InitialFileValues>
            label={
              <>
                Name &nbsp;
                <Button
                  type='default'
                  icon={<CopyOutlined />}
                  onClick={() => handlePasteName()}
                  style={{ backgroundColor: '#007BFF' }}
                >
                  Paste
                </Button>
              </>
            }
            name='Name'
            rules={[{ required: true, message: 'Please input product name' }]}
          >
            <Input
              onChange={(e) => {
                const category = detectCategory(e.target.value, cateKeyword);
                form.setFieldValue('Categories', category);
              }}
              allowClear
              suffix={
                <Button
                  tabIndex={-1}
                  onClick={() => {
                    form.setFieldValue(
                      'Name',
                      form
                        .getFieldValue('Name')
                        .split(' ')
                        .map(_capitalize)
                        .join(' ')
                    );
                  }}
                >
                  Capitalize
                </Button>
              }
            />
          </Form.Item>

          <Form.Item<InitialFileValues>
            label={
              <>
                Images &nbsp;
                <Button
                  type='default'
                  icon={<CopyOutlined />}
                  onClick={() => handlePasteImages()}
                  style={{ backgroundColor: '#FFC107' }}
                >
                  Paste Multiple
                </Button>
              </>
            }
            name='Images'
            rules={[{ required: true, message: 'Please input product images' }]}
          >
            <Input.TextArea rows={4} allowClear />
          </Form.Item>

          <Form.Item>
            <Button
              htmlType='submit'
              block
              type='primary'
              style={{ width: '100%', backgroundColor: 'green' }}
            >
              Add Row
            </Button>
          </Form.Item>
        </Form>
      </div>
      {dataFile.length ? (
        <>
          <InitialFileTable
            data={dataFile}
            removeRecordByName={removeRecordByName}
          />
          <Button
            type='primary'
            style={{ marginTop: '10px' }}
            htmlType='button'
            onClick={() => {
              handleDownloadFile(dataFile, 'initial-file');
              setDataLocal('[]');
            }}
            block
          >
            <DownloadOutlined /> Download
          </Button>
        </>
      ) : null}
    </div>
  );
};

export default InitialFile;
