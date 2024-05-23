'use client';
import { QuestionCircleOutlined } from '@ant-design/icons';
import { Collapse, CollapseProps, Image, Modal, Typography } from 'antd';
import { useState } from 'react';

const { Title, Text, Link } = Typography;
const Instruction = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const showModal = () => {
    setIsModalOpen(true);
  };
  const items: CollapseProps['items'] = [
    {
      key: '1',
      label: 'How to get API key',
      children: (
        <div>
          <Text type='success'>
            Go to{' '}
            <a href='https://discord.pawan.krd/' target='_blank'>
              https://discord.pawan.krd/
            </a>
            Go to ⁠🤖𝐁𝐨𝐭 Then do the /key command. It will give you your own
            key, make sure to not share it with anyone.
            <br />
          </Text>
          <Text type='warning'>
            Note: API Keys are IP Locked, if you need to use it from another IP
            you need to reset your IP by doing /resetip command in ⁠🤖𝐁𝐨𝐭
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
        </div>
      ),
    },
    {
      key: '3',
      label: 'How to get telegram chat id',
      children: (
        <div>
          <Text type='success'>
            Go to your telegram account and search for the bot called&nbsp;
            <Link href='https://t.me/userinfobot' type='warning' target='_blank'>@userinfobot</Link>. Click on the start button and it will give you your
            chat id.
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
