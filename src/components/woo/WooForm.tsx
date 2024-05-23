'use client';
import {
  Button,
  Card,
  Flex,
  Form,
  Input,
  Progress,
  Select,
  Typography,
  Upload,
} from 'antd';
import { useMemo, useState } from 'react';
import { useLocalStorage } from 'usehooks-ts';
import _get from 'lodash/get';
import { handleCreateFileWoo, handleDownloadFile } from '@/helper/woo';
import { WooCommerce } from '@/types/woo';
import { useCategories } from '@/app/hooks/useCategories';
import TextArea from 'antd/es/input/TextArea';
import { normFile } from '@/helper/common';
import { useWatermarkWebsites } from '@/app/hooks/useWatermarkWebsites';
const { Text } = Typography;

interface FormValue {
  apiKey: string;
  file: FileList;
  promptQuestion: string;
  category: string;
  watermarkWebsite: string;
}

export const KEY_LOCAL_STORAGE = 'api-key';
const PROMPT_QUESTION_LOCAL_STORAGE = 'prompt-question';

const WooForm = () => {
  const [form] = Form.useForm<FormValue>();
  const [dataFile, setDataFile] = useState<WooCommerce[]>([]);
  const [apiKeyLocal, setApiKeyLocal] = useLocalStorage(KEY_LOCAL_STORAGE, '');
  const [promptQuestion, setPromptQuestion] = useLocalStorage(
    PROMPT_QUESTION_LOCAL_STORAGE,
    ''
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [percent, setPercent] = useState<number>(0);

  const { categories } = useCategories();
  const { watermarkWebsites } = useWatermarkWebsites();

  const categoriesOptions = useMemo(() => {
    if (!categories) return [];
    return categories.map((category) => ({
      label: category.templateName,
      value: category._id,
    }));
  }, [categories]);

  const watermarkOptions = useMemo(() => {
    if (!watermarkWebsites) return [];
    return watermarkWebsites.map((watermark) => ({
      label: watermark.shopName,
      value: watermark._id,
    }));
  }, [watermarkWebsites]);

  const onFinish = async (value: FormValue) => {
    setPercent(0);
    setLoading(true);
    const { file, apiKey, promptQuestion, category } = value;
    const categoriesObject = categories?.find((item) => item._id === category);
    const watermarkObject = watermarkWebsites?.find(
      (item) => item._id === value.watermarkWebsite
    );
    setApiKeyLocal(apiKey);
    setPromptQuestion(promptQuestion);
    setDataFile([]);
    if (file && categoriesObject && watermarkObject) {
      const data = await handleCreateFileWoo(
        _get(file[0], 'originFileObj'),
        apiKey,
        promptQuestion,
        categoriesObject,
        watermarkObject,
        setPercent
      );
      setDataFile(data);
    }
    setLoading(false);
  };

  return (
    <Form
      form={form}
      onFinish={onFinish}
      initialValues={{ apiKey: apiKeyLocal, promptQuestion: promptQuestion }}
      layout='vertical'
    >
      <Card>
        <Form.Item<FormValue>
          name='apiKey'
          label='Key ChatGPT'
          rules={[{ required: true, message: 'Please input API key!' }]}
        >
          <Input type='text' placeholder='API key' />
        </Form.Item>
        <Form.Item<FormValue>
          name='promptQuestion'
          label='Prompt Question'
          rules={[{ required: true, message: 'Please input prompt question!' }]}
        >
          <TextArea
            rows={4}
            placeholder='Ex: Write a story about {key} with 100 words'
          />
        </Form.Item>
        <Form.Item<FormValue>
          name='category'
          label='Choose Category'
          rules={[{ required: true, message: 'Please select category!' }]}
        >
          <Select
            placeholder='Select Category'
            options={categoriesOptions}
            showSearch
          />
        </Form.Item>
        <Form.Item<FormValue>
          name='watermarkWebsite'
          label='Watermark Website'
          rules={[
            { required: true, message: 'Please select watermark for website!' },
          ]}
        >
          <Select
            placeholder='Select Watermark Website'
            options={watermarkOptions}
            showSearch
          />
        </Form.Item>

        <Form.Item<FormValue>
          name='file'
          valuePropName='fileList'
          label='File'
          getValueFromEvent={normFile}
          rules={[{ required: true, message: 'Please upload file!' }]}
        >
          <Upload maxCount={1}>
            <Button>Upload file excel</Button>
          </Upload>
        </Form.Item>
        {loading ? (
          <>
            <Progress
              percent={Number(percent.toFixed(0))}
              strokeColor={{
                '0%': '#108ee9',
                '100%': '#87d068',
              }}
            />
            <Text type='warning'>
              *Note: Should not close the browser while processing
            </Text>
          </>
        ) : null}
      </Card>
      <Flex justify='center' gap={16} style={{ marginTop: 24 }}>
        <Button htmlType='submit' loading={loading}>
          Process
        </Button>
        {dataFile.length > 0 && (
          <Button
            htmlType='button'
            type='primary'
            onClick={() => handleDownloadFile(dataFile)}
          >
            Download
          </Button>
        )}
      </Flex>
    </Form>
  );
};

export default WooForm;
