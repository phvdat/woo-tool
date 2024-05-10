'use client';
import { sendMessage } from '@/services/send-message';
import { Button, Card, Flex, Form, Input, Upload } from 'antd';
import { useState } from 'react';
import { useLocalStorage } from 'usehooks-ts';
import * as XLSX from 'xlsx';
import _get from 'lodash/get';

interface FormValue {
  apiKey: string;
  file: FileList;
  promptQuestion: string;
}

const KEY_LOCAL_STORAGE = 'api-key';
const PROMPT_QUESTION_LOCAL_STORAGE = 'prompt-question';

const normFile = (event: unknown) => {
  if (Array.isArray(event)) {
    return event;
  }
  return event && _get(event, 'fileList');
};
const Home = () => {
  const [processedData, setProcessedData] = useState<any[]>([]);
  const [apiKeyLocal, setApiKeyLocal] = useLocalStorage(KEY_LOCAL_STORAGE, '');
  const [promptQuestion, setPromptQuestion] = useLocalStorage(
    PROMPT_QUESTION_LOCAL_STORAGE,
    ''
  );

  const [form] = Form.useForm<FormValue>();

  const processing = (file: any, apiKey: string, promptQuestion: string) => {
    const promise = new Promise((resolve, reject) => {
      const fileReader = new FileReader();
      fileReader.readAsArrayBuffer(file);
      fileReader.onload = async (e) => {
        const bufferArray = e.target?.result;
        const wb = XLSX.read(bufferArray, {
          type: 'buffer',
        });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        const processedData: any = [];
        for (const row of data) {
          const rowData = row as any;
          const keyWord: string = rowData['Name'];
          const question = promptQuestion.replaceAll('{key}', keyWord);
          const data = await sendMessage(question, apiKey);
          const content = _get(data, 'choices[0].message.content');

          processedData.push({ ...rowData, ChatGPTcontent: content });
        }
        setProcessedData(processedData);
        resolve(processedData);
      };
      fileReader.onerror = (error) => {
        reject(error);
      };
    });
    promise.then(() => {
      // Handle further actions if needed
    });
  };

  const handleDownload = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(processedData);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet 1');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'processed_file.xlsx';
    link.click();
    URL.revokeObjectURL(url);
  };

  const onFinish = (value: FormValue) => {
    const { file, apiKey, promptQuestion } = value;
    setApiKeyLocal(apiKey);
    setPromptQuestion(promptQuestion);
    setProcessedData([]);
    if (file) {
      processing(_get(file[0], 'originFileObj'), apiKey, promptQuestion);
    }
  };
  return (
    <Form
      form={form}
      onFinish={onFinish}
      initialValues={{ apiKey: apiKeyLocal, promptQuestion: promptQuestion }}
      style={{
        width: 600,
        margin: '20px auto',
      }}
    >
      <Card>
        <Form.Item<FormValue> name='apiKey'>
          <Input type='text' placeholder='API key' />
        </Form.Item>
        <Form.Item<FormValue> name='promptQuestion'>
          <Input
            type='text'
            placeholder='Ex: Write a story about {key} with 100 words'
          />
        </Form.Item>
        <Form.Item<FormValue>
          name='file'
          required
          valuePropName='fileList'
          getValueFromEvent={normFile}
        >
          <Upload maxCount={1}>
            <Button>Upload file excel</Button>
          </Upload>
        </Form.Item>
      </Card>
      <Flex justify='center' gap={16} style={{ marginTop: 24 }}>
        <Button htmlType='submit'>Processing</Button>
        {processedData.length > 0 && (
          <Button htmlType='button' type='primary' onClick={handleDownload}>
            Download
          </Button>
        )}
      </Flex>
    </Form>
  );
};

export default Home;
