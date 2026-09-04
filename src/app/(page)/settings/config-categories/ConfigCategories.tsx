"use client";
import { useCategories } from "@/app/hooks/useCategories";
import { useConfigWebsite } from "@/app/hooks/useConfigWebsite";
import Container from "@/components/commons/Container";
import CategoryItem from "@/components/settings/CategoryItem";
import DuplicateAllCate from "@/components/settings/DuplicateAllCate";
import UpdateCategory, {
  TypeUpdateCategory,
} from "@/components/settings/UpdateCategoryModal";
import { Card, Empty, Flex, List, Radio, Spin, Typography } from "antd";
import _toString from "lodash/toString";
import { useEffect, useState } from "react";
const { Text } = Typography;

const ConfigCategories = () => {
  const [webSite, setWebSite] = useState("");
  const { categories, isLoading: cateLoading, mutate } = useCategories(webSite);
  const { websiteConfigList, isLoading: websiteLoading } = useConfigWebsite();
  const options =
    websiteConfigList?.map((item) => ({
      label: item.shopName,
      value: item._id as string,
    })) || [];

  useEffect(() => {
    setWebSite(options[0]?.value || "");
  }, [websiteConfigList]);

  return (
    <Container
      title="Category Configuration"
      subtitle="Manage product categories for each website"
      breadcrumb={[{ title: "Settings" }, { title: "Categories" }]}
      extra={<DuplicateAllCate />}
    >
      <Card style={{ marginBottom: 16 }}>
        <Flex gap={16} align="center" justify="center" wrap="wrap">
          {websiteLoading ? (
            <Spin />
          ) : (
            <Radio.Group
              options={[...options, { label: "All", value: "" }]}
              defaultValue={options[0]?.value}
              optionType="button"
              buttonStyle="solid"
              onChange={(e) => setWebSite(e.target.value)}
            />
          )}
        </Flex>
      </Card>

      <Card>
        {cateLoading ? (
          <Flex justify="center" style={{ padding: 60 }}>
            <Spin size="large" />
          </Flex>
        ) : categories && categories.length > 0 ? (
          <List
            dataSource={categories.sort((a, b) =>
              _toString(a.shopID).localeCompare(_toString(b.shopID)),
            )}
            renderItem={(item) => (
              <List.Item>
                <CategoryItem
                  key={item._id}
                  category={item}
                  accessAble={webSite !== ""}
                  refresh={mutate}
                />
              </List.Item>
            )}
          />
        ) : (
          <Empty description={<Text type="secondary">No categories found. Select a website to view categories.</Text>} />
        )}
      </Card>

      <div style={{ marginTop: 16 }}>
        <UpdateCategory
          label={TypeUpdateCategory.ADD_CATEGORY}
          refresh={mutate}
        />
      </div>
    </Container>
  );
};

export default ConfigCategories;
