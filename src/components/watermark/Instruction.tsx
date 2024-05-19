'use client';
import { QuestionCircleOutlined } from '@ant-design/icons';
import { Collapse, CollapseProps, Image, Modal, Typography } from 'antd';
import { useState } from 'react';

const { Title, Text } = Typography;
const Instruction = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const showModal = () => {
    setIsModalOpen(true);
  };
  const items: CollapseProps['items'] = [
    {
      key: '1',
      label: 'How to get id telegram',
      children: (
        <div>
          <Text type='success'>
            Open your telegram app
            <br />
            Search for the bot @userinfobot
            <br />
            Click start
            <br />
          </Text>
        </div>
      ),
    },
    {
      key: '2',
      label: 'Excel format',
      children: (
        <div>
          <Text type='success'>
            The excel file should be in .xlsx format. The first row should be
            the headers and the first column should be the name of the product.
            the second column should be the images of the product.
          </Text>
          <Image
            src='assets/excel-format.png'
            alt='Excel format'
            style={{ width: '100%' }}
          />
          <Text type='warning'>
            Note: The maximum file size returned is 50MB, so we recommend that the excel file should not exceed 100 rows
          </Text>
        </div>
      ),
    }
  ];
  return (
    <>
      <Title
        level={5}
        onClick={showModal}
        underline
        style={{ cursor: 'pointer' }}
      >
        Instruction <QuestionCircleOutlined />
      </Title>
      <Modal
        title='Instruction'
        open={isModalOpen}
        onOk={() => setIsModalOpen(false)}
        onCancel={() => setIsModalOpen(false)}
      >
        <Collapse items={items} />
      </Modal>
    </>
  );
};

export default Instruction;
