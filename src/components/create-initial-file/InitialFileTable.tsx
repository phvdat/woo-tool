import { InitialFileValues } from '@/app/(page)/create-initial-file/InitialFile';
import { Table, TableProps } from 'antd';

const InitialFileTable = ({
  data,
}: {
  data: Omit<InitialFileValues, 'website'>[];
}) => {
  const columns: TableProps<Omit<InitialFileValues, 'website'>>['columns'] = [
    {
      title: 'Name',
      dataIndex: 'Name',
      key: 'name',
      width: '20%',
    },
    {
      title: 'Images',
      dataIndex: 'Images',
      key: 'images',
      width: '60%',
    },
    {
      title: 'Categories',
      dataIndex: 'Categories',
      key: 'categories',
      width: '20%',
    },
  ];

  const dataSource = data.map((item) => ({
    ...item,
    key: item.Name,
  }));

  return (
    <Table
      dataSource={dataSource}
      columns={columns}
      pagination={false}
      scroll={{ x: 768, y: 400 }}
    />
  );
};

export default InitialFileTable;
