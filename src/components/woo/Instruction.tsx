'use client';
import { QuestionCircleOutlined } from '@ant-design/icons';
import { Collapse, CollapseProps, Modal, Typography } from 'antd';
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
      label: 'How to get API key',
      children: (
        <div>
          <Text type='secondary'>
            Go to{' '}
            <a href='https://discord.pawan.krd/' target='_blank'>
              https://discord.pawan.krd/
            </a>
            Go to ⁠🤖𝐁𝐨𝐭 Then do the /key command. It will give you your own
            key, make sure to not share it with anyone.
            <br />
          </Text>
          <Text type='secondary'>
            Note: API Keys are IP Locked, if you need to use it from another IP
            you need to reset your IP by doing /resetip command in ⁠🤖𝐁𝐨𝐭
          </Text>
        </div>
      ),
    },
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