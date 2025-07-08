'use client';

import React from 'react';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, Flex, Typography } from 'antd';
const { Title } = Typography;

export const SortableItem = ({ item }: { item: any }) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    padding: 10,
    margin: 10,
    flex: 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card
        style={{
          marginBottom: 12,
        }}
      >
        <Flex gap={12} justify='space-between'>
          <div>{item.Name}</div>
          <img width={100} height={100} src={item.Images.split(',')[0]} />
        </Flex>
      </Card>
    </div>
  );
};

const DroppableColumn = ({ id, items }: { id: string; items: any[] }) => {
  return (
    <Card
      style={{
        border: '1px solid #ccc',
        boxShadow: 'rgba(0, 0, 0, 0.35) 0px 5px 15px',
        margin: 4,
      }}
    >
      <Title level={5} style={{ textAlign: 'center' }}>
        {id}
      </Title>
      <SortableContext
        items={items.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        {items.map((item) => (
          <SortableItem key={item.id} item={item} />
        ))}
      </SortableContext>
    </Card>
  );
};

export default DroppableColumn;
