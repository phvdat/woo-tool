"use client";

import { signIn } from "next-auth/react";
import { Button, Typography } from "antd";
import {
  GoogleOutlined,
  CloudDownloadOutlined,
  ToolOutlined,
  VideoCameraOutlined,
  BarChartOutlined,
  SafetyOutlined,
  RocketOutlined,
} from "@ant-design/icons";
import { useState } from "react";

const { Title, Text } = Typography;

const features = [
  {
    icon: <CloudDownloadOutlined />,
    title: "Product Crawler",
    desc: "Extract products from any WooCommerce store",
  },
  {
    icon: <ToolOutlined />,
    title: "Smart Converter",
    desc: "Convert and format product data automatically",
  },
  {
    icon: <VideoCameraOutlined />,
    title: "Video Generator",
    desc: "Create product videos with AI-powered rendering",
  },
  {
    icon: <BarChartOutlined />,
    title: "Revenue Analytics",
    desc: "Track sales and performance across websites",
  },
];

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    await signIn("google", { callbackUrl: "/" });
  };

  return (
    <div className="login-wrapper">
      <div className="login-split">
        {/* Left Panel - Branding */}
        <div className="login-left">
          <div className="login-left-content">
            <div className="login-brand">
              <div className="login-logo-lg">W</div>
              <span className="login-brand-text">WooTool</span>
            </div>

            <div className="login-headline">
              <Title
                level={2}
                style={{ color: "#fff", margin: 0, fontWeight: 700 }}
              >
                WooCommerce
              </Title>
              <Title
                level={2}
                style={{
                  color: "rgba(255,255,255,0.8)",
                  margin: 0,
                  fontWeight: 300,
                }}
              >
                Automation Platform
              </Title>
            </div>

            <div className="login-features">
              {features.map((f, i) => (
                <div key={i} className="login-feature-item">
                  <div className="login-feature-icon">{f.icon}</div>
                  <div>
                    <Text strong style={{ color: "#fff", fontSize: 14 }}>
                      {f.title}
                    </Text>
                    <br />
                    <Text
                      style={{ color: "rgba(255,255,255,0.7)", fontSize: 13 }}
                    >
                      {f.desc}
                    </Text>
                  </div>
                </div>
              ))}
            </div>

            <div className="login-left-footer">
              <SafetyOutlined
                style={{ color: "rgba(255,255,255,0.5)", marginRight: 6 }}
              />
              <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>
                Secure Google OAuth authentication
              </Text>
            </div>
          </div>
        </div>

        {/* Right Panel - Login Form */}
        <div className="login-right">
          <div className="login-form-wrapper">
            <div className="login-form-header">
              <div className="login-logo-md">
                <RocketOutlined style={{ fontSize: 24 }} />
              </div>
              <Title level={3} style={{ margin: "0 0 8px", fontWeight: 600 }}>
                Get started
              </Title>
              <Text type="secondary">Sign in to access your dashboard</Text>
            </div>

            <div className="login-form-body">
              <Button
                className="google-btn-custom"
                icon={<GoogleOutlined />}
                onClick={handleGoogleLogin}
                loading={loading}
                size="large"
              >
                Continue with Google
              </Button>
            </div>

            <div className="login-form-footer">
              <Text type="secondary" style={{ fontSize: 12 }}>
                By continuing, you agree to our Terms of Service
              </Text>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
