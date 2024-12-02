import { InitialFileValues } from '@/app/(page)/create-initial-file/InitialFile';
import { DeleteOutlined } from '@ant-design/icons';
import { Button, message, Popconfirm, Table, TableProps } from 'antd';

interface InitialFileTableProps {
  data: Omit<InitialFileValues, 'website'>[];
  removeRecordByName: (name: string) => void;
}

const InitialFileTable = ({
  data,
  removeRecordByName,
}: InitialFileTableProps) => {
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    message.success('Copy successfully');
  };

  const columns: TableProps<Omit<InitialFileValues, 'website'>>['columns'] = [
    {
      title: 'Name',
      dataIndex: 'Name',
      key: 'name',
      width: '15%',
      render(value) {
        return (
          <div style={{ cursor: 'pointer' }} onClick={() => handleCopy(value)}>
            {value}
          </div>
        );
      },
    },
    {
      title: 'Images',
      dataIndex: 'Images',
      key: 'images',
      width: '60%',
      render(value) {
        return (
          <div style={{ cursor: 'pointer' }} onClick={() => handleCopy(value)}>
            {value}
          </div>
        );
      },
    },
    {
      title: 'Categories',
      dataIndex: 'Categories',
      key: 'categories',
      width: '15%',
    },
    {
      title: 'Action',
      key: 'action',
      width: '10%',
      render: (_, record) => (
        <Popconfirm
          title='Delete this row?'
          onConfirm={() => removeRecordByName(record.Name)}
          okText='Yes'
          cancelText='No'
        >
          <Button danger icon={<DeleteOutlined />}></Button>
        </Popconfirm>
      ),
    },
  ];

  const dataSource = data.map((item) => ({
    ...item,
    key: item.Name,
  }));

  return (
    <Table
      bordered
      dataSource={dataSource}
      columns={columns}
      pagination={false}
      scroll={{ x: 768, y: 400 }}
    />
  );
};

export default InitialFileTable;
