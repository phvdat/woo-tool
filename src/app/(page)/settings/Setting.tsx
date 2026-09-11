"use client";
import { useUser } from "@/app/hooks/useUser";
import Container from "@/components/commons/Container";
import { UsersFormValues } from "@/components/management-users/ManagementUsersForm";
import { endpoint } from "@/constant/endpoint";
import { handleErrorMongoDB } from "@/helper/common";
import { Card, Button, Form, Input, message, Row, Col, Typography } from "antd";
import { UserOutlined, KeyOutlined } from "@ant-design/icons";
import axios from "axios";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
const { TextArea } = Input;
const { Text } = Typography;

interface SettingProps {
  isAdmin: boolean;
}

const Setting = ({ isAdmin }: SettingProps) => {
  const [form] = Form.useForm<UsersFormValues>();
  const { data } = useSession();
  const { user } = useUser(data?.user?.email || "");
  const [loading, setLoading] = useState<boolean>(false);

  const updateInformation = async (values: UsersFormValues) => {
    setLoading(true);
    try {
      const payload = {
        ...values,
      };

      await axios.put(endpoint.user, {
        ...payload,
        email: data?.user?.email,
      });
      message.success("Update information successfully");
    } catch (error) {
      const { errorMessage } = handleErrorMongoDB(error);
      message.error(errorMessage || "Failed to update information");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    form.setFieldsValue({
      ...user,
    });
  }, [form, user]);

  return (
    <Container
      title="Profile Settings"
      subtitle="Manage your account settings and preferences"
      breadcrumb={[{ title: "Settings" }, { title: "Profile" }]}
    >
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={8}>
          <Card>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #4F46E5, #7C3AED)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                  fontSize: 32,
                  color: "white",
                  fontWeight: 700,
                }}
              >
                {data?.user?.name?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <Text strong style={{ fontSize: 16, display: "block" }}>
                {data?.user?.name || "User"}
              </Text>
              <Text type="secondary" style={{ fontSize: 13 }}>
                {data?.user?.email}
              </Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={16}>
          <Card title="Account Information">
            <Form
              onFinish={updateInformation}
              form={form}
              initialValues={user}
              layout="vertical"
              disabled={loading}
            >
              <Form.Item<UsersFormValues>
                name="telegramId"
                label={
                  <span>
                    <UserOutlined style={{ marginRight: 8 }} />
                    Telegram ID
                  </span>
                }
                rules={[{ required: true, message: "Please input telegram id" }]}
              >
                <Input placeholder="Enter telegram id for receive file" size="large" />
              </Form.Item>

              <Form.Item<UsersFormValues>
                name="apiKey"
                label={
                  <span>
                    <KeyOutlined style={{ marginRight: 8 }} />
                    API Key (ChatGPT)
                  </span>
                }
                rules={[{ required: true, message: "Please input API key!" }]}
              >
                <Input.Password placeholder="Enter your API key" size="large" />
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" block size="large" loading={loading}>
                  Save Changes
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Setting;
