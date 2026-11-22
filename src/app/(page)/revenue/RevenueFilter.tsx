"use client";

import { WooWebsitePayload } from "@/types/woo";
import { DatePicker, Form, Input, Select, Spin } from "antd";
import dayjs from "dayjs";
import { useEffect, useRef } from "react";

const { RangePicker } = DatePicker;

export interface RevenueFilterValue {
  websiteId?: string;
  groupBy: "hour" | "day";
  range: [dayjs.Dayjs, dayjs.Dayjs];
  search?: string;
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
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const emitChange = (values: RevenueFilterValue) => {
    if (
      values.websiteId !== undefined &&
      values.groupBy &&
      values.range?.length === 2
    ) {
      onChange(values);
    }
  };

  const handleValuesChange = (changedValues: Partial<RevenueFilterValue>) => {
    if (Object.prototype.hasOwnProperty.call(changedValues, "search")) {
      if (searchTimer.current) clearTimeout(searchTimer.current);
      searchTimer.current = setTimeout(() => {
        searchTimer.current = null;
        emitChange(form.getFieldsValue(true));
      }, 400);
      return;
    }

    if (searchTimer.current) {
      clearTimeout(searchTimer.current);
      searchTimer.current = null;
    }
    emitChange(form.getFieldsValue(true));
  };

  useEffect(
    () => () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    },
    [],
  );

  return (
    <Spin spinning={loading}>
      <Form
        form={form}
        layout="inline"
        style={{
          gap: "8px",
        }}
        initialValues={{
          websiteId: "all",
          groupBy: "day",
          range: [dayjs().subtract(7, "day"), dayjs()],
          search: "",
        }}
        onValuesChange={handleValuesChange}
      >
        <Form.Item name="search">
          <Input
            allowClear
            placeholder="Search by product name..."
            style={{ width: 240 }}
          />
        </Form.Item>

        <Form.Item name="websiteId">
          <Select
            loading={loading}
            style={{ width: 150 }}
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
            style={{ width: 150 }}
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
            showNow
            showTime={{
              format: "HH:mm",
            }}
            format="DD-MM HH:mm"
            allowClear={false}
            onCalendarChange={() => {}}
          />
        </Form.Item>
      </Form>
    </Spin>
  );
}
