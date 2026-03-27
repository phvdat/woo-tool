"use client";
import { useUser } from "@/app/hooks/useUser";
import { UsersFormValues } from "@/components/management-users/ManagementUsersForm";
import ManagementStorage from "@/components/setting/ManagementStorage";
import { endpoint } from "@/constant/endpoint";
import { navigation } from "@/constant/navigation";
import { handleErrorMongoDB } from "@/helper/common";
import {
  Button,
  Col,
  Divider,
  Flex,
  Form,
  Input,
  InputNumber,
  message,
  Row,
} from "antd";
import axios from "axios";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
const { TextArea } = Input;

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
      console.log("error update user", errorMessage);
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
    <div
      style={{
        maxWidth: 600,
        margin: "20px auto",
      }}
    >
      <Form
        onFinish={updateInformation}
        form={form}
        initialValues={user}
        layout="vertical"
        disabled={loading}
        labelCol={{ style: { minWidth: 150 } }}
        labelAlign="left"
      >
        <Row gutter={[20, 20]}>
          <Col span={12}>
            <Form.Item<UsersFormValues>
              name="telegramId"
              label="Telegram ID"
              shouldUpdate
              rules={[{ required: true, message: "Please input telegram id" }]}
            >
              <Input
                type="text"
                placeholder="Enter telegram id for receive file"
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item<UsersFormValues>
              name="publicTime"
              label="Public Minutes"
              shouldUpdate
            >
              <InputNumber
                type="text"
                placeholder="Enter waiting minutes for start public"
                style={{ width: "100%" }}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={[20, 20]}>
          <Col span={12}>
            <Form.Item<UsersFormValues>
              label="Gap Time From"
              name="gapFrom"
              rules={[{ required: true, message: "Please input gap time!" }]}
            >
              <InputNumber
                min={0}
                style={{ width: "100%" }}
                placeholder="From"
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item<UsersFormValues>
              label="Gap Time To"
              name="gapTo"
              rules={[{ required: true, message: "Please input gap time!" }]}
            >
              <InputNumber
                min={0}
                style={{ width: "100%" }}
                placeholder="From"
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item<UsersFormValues>
          name="apiKey"
          label="Key ChatGPT"
          rules={[{ required: true, message: "Please input API key!" }]}
        >
          <Input type="text" placeholder="API key" />
        </Form.Item>

        <Form.Item<UsersFormValues>
          name="promptDescriptionProduct"
          label="Prompt Description Product"
          rules={[
            {
              required: true,
              message: "Please input Prompt Description Product!",
            },
          ]}
        >
          <TextArea
            rows={4}
            placeholder="Ex: Write a story about {product-name} with 100 words"
          />
        </Form.Item>

        <Form.Item<UsersFormValues>
          name="promptTagsProduct"
          label="Prompt Tags Product"
          rules={[
            {
              required: true,
              message: "Please input Prompt Tags Product!",
            },
          ]}
        >
          <TextArea
            rows={4}
          />
        </Form.Item>

        <Button type="primary" htmlType="submit" block>
          Save
        </Button>
      </Form>
    </div>
  );
};

export default Setting;
