'use client';
import { TrackingOrderCombined } from '@/app/(page)/tracking-checker/TrackingChecker';
import { Col, Row, Table, TableProps } from 'antd';
import dayjs from 'dayjs';
import { uniqBy } from 'lodash';
import { useMemo } from 'react';

const TrackingTable = ({ data }: { data: TrackingOrderCombined[] }) => {
  const columns = useMemo<TableProps<TrackingOrderCombined>['columns']>(
    () => [
      {
        title: 'Store Name',
        dataIndex: 'store_name',
        key: 'store_name',
        filters: uniqBy(data, 'store_name').map((item) => ({
          text: item.store_name,
          value: item.store_name,
        })),
        onFilter: (value, record) => record.store_name === value,
      },
      {
        title: 'Order Number',
        dataIndex: 'order_number',
        key: 'order_number',
      },
      {
        title: 'Order Create Date',
        dataIndex: 'order_create_date',
        key: 'order_create_date',
        render: (value) => dayjs(value).format('DD MMM YYYY - HH:mm'),
        sorter: (a, b) =>
          dayjs(a.order_create_date).unix() - dayjs(b.order_create_date).unix(),
      },
      {
        title: 'Item Status',
        dataIndex: 'item_status',
        key: 'item_status',
        filters: uniqBy(data, 'item_status').map((item) => ({
          text: item.item_status,
          value: item.item_status,
        })),
        filterSearch: true,
        onFilter: (value, record) => record.item_status === value,
      },
      {
        title: 'Tracking Id',
        dataIndex: 'item_trackings',
        key: 'item_trackings',
        filters: [
          {
            text: 'Tracking Empty',
            value: ' ',
          },
        ],
        filterSearch: true,
        onFilter: (value, record) => record.item_trackings === value,
      },
      {
        title: 'Tracking Status',
        dataIndex: 'tracking_status',
        key: 'tracking_status',
        filters: uniqBy(data, 'tracking_status').map((item) => ({
          text: item.tracking_status,
          value: item.tracking_status,
        })),
        filterSearch: true,
        onFilter: (value, record) => record.tracking_status === value,
      },
    ],
    [data]
  );

  const dataSource = data.map((item) => ({
    ...item,
    key: item.item_id,
  }));
  return (
    <Table
      bordered
      dataSource={dataSource}
      columns={columns}
      pagination={{
        defaultPageSize: 100,
      }}
      expandable={{
        expandedRowRender: (record) => (
          <Row>
            <Col span={12}>
              <p>Product Type: {record.product_name}</p>
            </Col>
            <Col span={12}>
              <p>Product Price: ${record.item_total_price}</p>
            </Col>
            <Col span={12}>
              <p>Shipping Price: {record.item_shipping_price}</p>
            </Col>
            <Col span={12}>
              <p>Shipping Method: {record.shipping_method}</p>
            </Col>
            <Col span={12}>
              <p>Email: {record.email}</p>
            </Col>
            <Col span={12}>
              <p>Shipping Country: {record.shipping_country}</p>
            </Col>
            <Col span={12}>
              <p>Tracking Carrier: {record.tracking_carrier}</p>
            </Col>
          </Row>
        ),
      }}
      footer={() =>
        `Total Orders: ${uniqBy(data, 'order_number').length} | Total Items: ${
          data.length
        }`
      }
    />
  );
};

export default TrackingTable;
