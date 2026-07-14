"use client";

import { WooWebsitePayload } from "@/types/woo";
import { DatePicker, Form, Select, Spin } from "antd";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;

export interface RevenueFilterValue {
  websiteId?: string;
  groupBy: "hour" | "day";
  range: [dayjs.Dayjs, dayjs.Dayjs];
}

interface RevenueFilterProps {
  websites?: WooWebsitePayload[];
  loading?: boolean;
  onChange: (values: RevenueFilterValue) => void;
}

export default function RevenueFilter({
  websites,
  loading,
  onChange,
}: RevenueFilterProps) {
  const [form] = Form.useForm<RevenueFilterValue>();

  const handleValuesChange = () => {
    const values = form.getFieldsValue(true);

    if (
      values.websiteId !== undefined &&
      values.groupBy &&
      values.range?.length === 2
    ) {
      onChange(values);
    }
  };

  return (
    <Spin spinning={loading}>
      <Form
        form={form}
        layout="inline"
        initialValues={{
          websiteId: "all",
          groupBy: "day",
          range: [dayjs().subtract(7, "day"), dayjs()],
        }}
        onValuesChange={handleValuesChange}
      >
        <Form.Item name="websiteId">
          <Select
            loading={loading}
            style={{ width: 220 }}
            options={[
              {
                label: "All",
                value: "all",
              },
              ...(websites?.map((item) => ({
                label: item.shopName,
                value: item._id,
              })) ?? []),
            ]}
          />
        </Form.Item>

        <Form.Item name="groupBy">
          <Select
            loading={loading}
            style={{ width: 120 }}
            options={[
              {
                label: "Hour",
                value: "hour",
              },
              {
                label: "Day",
                value: "day",
              },
            ]}
          />
        </Form.Item>

        <Form.Item name="range">
          <RangePicker
            showTime
            allowClear={false}
            onCalendarChange={() => {}}
          />
        </Form.Item>
      </Form>
    </Spin>
  );
}
