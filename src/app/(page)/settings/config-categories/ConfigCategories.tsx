"use client";
import { useCategories } from "@/app/hooks/useCategories";
import { useConfigWebsite } from "@/app/hooks/useConfigWebsite";
import CategoryItem from "@/components/settings/CategoryItem";
import UpdateCategory, {
  TypeUpdateCategory,
} from "@/components/settings/UpdateCategoryModal";
import { Flex, List, Radio, Spin, Typography } from "antd";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import _toString from "lodash/toString";
import DuplicateAllCate from "@/components/settings/DuplicateAllCate";
const { Title } = Typography;

const ConfigCategories = () => {
  const { data } = useSession();
  const [webSite, setWebSite] = useState("");
  const { categories, isLoading: cateLoading, mutate } = useCategories(webSite);
  const { websiteConfigList, isLoading: websiteLoading } = useConfigWebsite(
    data?.user?.email || "",
  );
  const options =
    websiteConfigList?.map((item) => ({
      label: item.shopName,
      value: item._id as string,
    })) || [];
    
  useEffect(() => {
    setWebSite(options[0]?.value || "");
  }, [websiteConfigList]);

  return (
    <Flex gap={20} vertical style={{ marginTop: 24 }}>
      {websiteLoading ? (
        <Spin />
      ) : (
        <Radio.Group
          options={[...options, { label: "All", value: "" }]}
          defaultValue={options[0]?.value}
          optionType="button"
          buttonStyle="solid"
          onChange={(e) => setWebSite(e.target.value)}
          style={{ textAlign: "center" }}
        />
      )}
      <DuplicateAllCate />
      <List
        loading={cateLoading}
        header={
          <Title level={4} style={{ textAlign: "center" }}>
            Config Categories
          </Title>
        }
        bordered
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
      <UpdateCategory
        label={TypeUpdateCategory.ADD_CATEGORY}
        refresh={mutate}
      />
    </Flex>
  );
};

export default ConfigCategories;
