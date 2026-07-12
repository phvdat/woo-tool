'use client';
import { useState } from 'react';
import { Button, DatePicker, Flex, notification, Spin } from 'antd';
import { ref, listAll, deleteObject, getMetadata } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import dayjs from 'dayjs';

const ManagementStorage = () => {
  const [loading, setLoading] = useState(false);
  const [cutoffDate, setCutoffDate] = useState<Date | null>(null);

  const handleDeleteFiles = async () => {
    setLoading(true);
    const folderRef = ref(storage);
    console.log(cutoffDate);

    if (!cutoffDate) {
      notification.error({
        message: 'Error',
        description: 'Please select a cutoff date.',
      });
      return;
    }
    try {
      const result = await listAll(folderRef);
      const promises = result.items.map(async (itemRef) => {
        const metadata = await getMetadata(itemRef);
        const fileDate = new Date(metadata.timeCreated);

        // Nếu file được tạo trước ngày cutoffDate thì xóa
        if (fileDate < cutoffDate) {
          await deleteObject(itemRef);
          console.log(`Deleted: ${itemRef.name}`);
        }
      });

      await Promise.all(promises);

      notification.success({
        message: 'Success',
        description: 'Files deleted successfully!',
      });
    } catch (error) {
      console.error('Error deleting files:', error);
      notification.error({
        message: 'Error',
        description: 'Failed to delete files.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Flex gap={10}>
      <DatePicker
        placeholder='Delete files older than'
        onChange={setCutoffDate}
        defaultPickerValue={dayjs().subtract(1, 'month')}
      />
      <Button
        type='primary'
        danger
        onClick={handleDeleteFiles}
        disabled={loading}
      >
        {loading ? <Spin size='small' /> : 'Delete Files'}
      </Button>
    </Flex>
  );
};

export default ManagementStorage;
