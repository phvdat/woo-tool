'use client';
import Container from '@/components/commons/Container';
import ManagementUsersForm from '@/components/management-users/ManagementUsersForm';
import UserList from '@/components/management-users/UserList';
import { Card } from 'antd';

const ManagementUsers = () => {
  return (
    <Container
      title="User Management"
      subtitle="Manage user accounts and permissions"
      breadcrumb={[{ title: "Settings" }, { title: "Users" }]}
    >
      <Card style={{ marginBottom: 16 }}>
        <ManagementUsersForm />
      </Card>
      <Card title="User List">
        <UserList />
      </Card>
    </Container>
  );
};

export default ManagementUsers;
