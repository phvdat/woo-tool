'use client';
import ManagementUsersForm from '@/components/management-users/ManagementUsersForm';
import UserList from '@/components/management-users/UserList';
import { Typography } from 'antd';
const { Title } = Typography;

const ManagementUsers = () => {
  return (
    <div
      style={{
        maxWidth: 600,
        margin: '20px auto',
      }}
    >
      <Title level={4}>Management Users</Title>
      <ManagementUsersForm />
      <UserList />
    </div>
  );
};

export default ManagementUsers;
