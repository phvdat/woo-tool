'use client';

import React, { useEffect, useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import DroppableColumn, { SortableItem } from './DroppableColumn';
import { Button, Flex } from 'antd';
import moment from 'moment';
import { generateCSVBlob } from '@/helper/woo';
import { saveAs } from 'file-saver';

export default function ProductSorter({
  items,
  webArray,
}: {
  items: any[];
  webArray: string[];
}) {
  const sensors = useSensors(useSensor(PointerSensor));
  const [columns, setColumns] = useState<Record<string, any[]>>({});
  const columnCount = webArray.length;
  const [activeId, setActiveId] = useState<null | string>();

  useEffect(() => {
    const base: Record<string, any[]> = {};
    webArray.forEach((key) => (base[key] = []));

    const chunkSize = Math.ceil(items.length / columnCount);
    for (let i = 0; i < columnCount; i++) {
      const start = i * chunkSize;
      const end = start + chunkSize;
      base[webArray[i]] = items.slice(start, end);
    }

    setColumns(base);
  }, [items]);

  const findColumn = (id: string): string | undefined => {
    return webArray.find((key) => columns[key]?.some((item) => item.id === id));
  };

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragOver = (event: any) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    const sourceCol = findColumn(activeId);
    const targetCol = findColumn(overId);

    if (!sourceCol || !targetCol) return;
    if (sourceCol === targetCol) return;

    const activeItem = columns[sourceCol].find((item) => item.id === activeId);
    if (!activeItem) return;

    const overIndex = columns[targetCol].findIndex(
      (item) => item.id === overId
    );
    const newIndex = overIndex >= 0 ? overIndex : columns[targetCol].length;

    setColumns((prev) => {
      const newSource = prev[sourceCol].filter((item) => item.id !== activeId);
      const newTarget = [...prev[targetCol]];
      newTarget.splice(newIndex, 0, activeItem); // ✅ insert vào đúng vị trí

      return {
        ...prev,
        [sourceCol]: newSource,
        [targetCol]: newTarget,
      };
    });
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    const sourceCol = findColumn(activeId);
    const targetCol = findColumn(overId);

    if (!sourceCol || !targetCol) return;

    // Nếu drag trong cùng 1 cột -> cần sắp xếp lại
    if (sourceCol === targetCol) {
      const oldIndex = columns[sourceCol].findIndex(
        (item) => item.id === activeId
      );
      const newIndex = columns[sourceCol].findIndex(
        (item) => item.id === overId
      );
      if (oldIndex !== newIndex && newIndex !== -1) {
        setColumns((prev) => ({
          ...prev,
          [sourceCol]: arrayMove(prev[sourceCol], oldIndex, newIndex),
        }));
      }
    }
  };

  const handleExportSingle = async (key: string) => {
    const date = moment().format('YYYY-MM-DD-HH-mm-ss');
    const csvBlob = await generateCSVBlob(columns[key]);
    saveAs(csvBlob, `${key}-${date}.csv`);
  };

  const activeItem = activeId
    ? Object.values(columns)
        .flat()
        .find((item) => item.id === activeId)
    : null;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
      }}
    >
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {webArray.map((key) => (
          <div key={key}>
            <DroppableColumn id={key} items={columns[key] || []} />
            <div style={{ marginTop: 12, textAlign: 'center' }}>
              <Button onClick={() => handleExportSingle(key)}>
                Export CSV {key}
              </Button>
            </div>
          </div>
        ))}
        <DragOverlay>
          {activeId ? <SortableItem item={activeItem} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
