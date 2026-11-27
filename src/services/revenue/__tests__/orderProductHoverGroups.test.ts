import { describe, expect, it } from "vitest";
import { buildOrderProducts } from "../buildOrders";
import { buildOrderProductHoverGroups } from "../orderProductHoverGroups";
import {
  RevenueOrderProduct,
  RevenueProductAttribute,
  RevenueProductStat,
} from "@/types/revenue";

const SHOE_NAME = "Chicago Bears NFL Premium Loafer Shoes";

function makeProduct(
  overrides: Partial<RevenueOrderProduct> = {}
): RevenueOrderProduct {
  return {
    productId: 104417,
    name: SHOE_NAME,
    image: "",
    link: "",
    quantity: 1,
    lineItemId: 1,
    ...overrides,
  };
}

function options(...pairs: [string, string][]): RevenueProductAttribute[] {
  return pairs.map(([name, value]) => ({ name, value }));
}

function makeStat(overrides: Partial<RevenueProductStat> = {}): RevenueProductStat {
  return {
    key: "site:id:104417",
    websiteId: "site",
    productId: 104417,
    name: SHOE_NAME,
    image: "",
    link: "",
    sku: "",
    quantity: 9,
    revenue: 100,
    unitPrice: 50,
    orders: 2,
    isVariable: false,
    variants: [],
    options: [],
    ...overrides,
  };
}

describe("buildOrderProductHoverGroups", () => {
  it("groups separate line items of the same product without merging their options", () => {
    const groups = buildOrderProductHoverGroups([
      makeProduct({
        lineItemId: 157,
        options: options(
          ["Gender", "Women"],
          ["Size (US)", "9"],
          ["Custom name (Optional)", "Julie"]
        ),
      }),
      makeProduct({
        lineItemId: 158,
        options: options(
          ["Gender", "Women"],
          ["Size (US)", "10"],
          ["Custom name (Optional)", "Kim"]
        ),
      }),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].quantity).toBe(2);
    expect(groups[0].product.lineItemId).toBe(157);
    expect(groups[0].sections).toHaveLength(2);
    expect(groups[0].sections[0]).toEqual({
      index: 1,
      attributes: [],
      options: options(
        ["Gender", "Women"],
        ["Size (US)", "9"],
        ["Custom name (Optional)", "Julie"]
      ),
    });
    expect(groups[0].sections[1]).toEqual({
      index: 2,
      attributes: [],
      options: options(
        ["Gender", "Women"],
        ["Size (US)", "10"],
        ["Custom name (Optional)", "Kim"]
      ),
    });
  });

  it("sums line item quantities instead of deduping by product identity", () => {
    const groups = buildOrderProductHoverGroups([
      makeProduct({
        lineItemId: 1,
        quantity: 2,
        options: options(["Size (US)", "9"]),
      }),
      makeProduct({
        lineItemId: 2,
        quantity: 3,
        options: options(["Size (US)", "10"]),
      }),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].quantity).toBe(5);
    expect(groups[0].sections.map((section) => section.options)).toEqual([
      options(["Size (US)", "9"]),
      options(["Size (US)", "10"]),
    ]);
  });

  it("keeps an empty section for a line item with no customization metadata", () => {
    const groups = buildOrderProductHoverGroups([
      makeProduct({
        lineItemId: 1,
        options: options(["Size (US)", "9"]),
      }),
      makeProduct({ lineItemId: 2 }),
    ]);

    expect(groups[0].quantity).toBe(2);
    expect(groups[0].sections).toHaveLength(2);
    expect(groups[0].sections[0].options).toEqual(options(["Size (US)", "9"]));
    expect(groups[0].sections[1].options).toEqual([]);
  });

  it("keeps WCPA per-unit fields separate for one line item with quantity greater than one", () => {
    const groups = buildOrderProductHoverGroups([
      makeProduct({
        quantity: 2,
        attributes: options(["Color", "Blue"]),
        units: [
          {
            index: 1,
            fields: options(["Size (US)", "9"], ["Custom name", "Julie"]),
          },
          {
            index: 2,
            fields: options(["Size (US)", "10"], ["Custom name", "Kim"]),
          },
        ],
      }),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].quantity).toBe(2);
    expect(groups[0].sections).toHaveLength(2);
    expect(groups[0].sections[0]).toEqual({
      index: 1,
      attributes: options(["Color", "Blue"]),
      options: options(["Size (US)", "9"], ["Custom name", "Julie"]),
    });
    expect(groups[0].sections[1]).toEqual({
      index: 2,
      attributes: options(["Color", "Blue"]),
      options: options(["Size (US)", "10"], ["Custom name", "Kim"]),
    });
  });

  it("keeps different products in the same order as separate groups", () => {
    const groups = buildOrderProductHoverGroups([
      makeProduct({
        productId: 104417,
        lineItemId: 1,
        quantity: 1,
        options: options(["Size (US)", "9"]),
      }),
      makeProduct({
        productId: 104418,
        name: "Different Loafer",
        lineItemId: 2,
        quantity: 1,
        options: options(["Size (US)", "10"]),
      }),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups.map((group) => group.quantity)).toEqual([1, 1]);
    expect(groups.map((group) => group.sections[0].options)).toEqual([
      options(["Size (US)", "9"]),
      options(["Size (US)", "10"]),
    ]);
  });

  it("handles missing or incomplete customization metadata", () => {
    const groups = buildOrderProductHoverGroups(
      [
        makeProduct({
          quantity: 1,
          options: [
            { name: "", value: "ignored" },
            { name: "Broken", value: "" },
          ],
        }),
      ],
      () =>
        makeStat({
          variants: [
            {
              key: "variant",
              label: "Blue",
              attributes: options(["Color", "Blue"]),
              quantity: 1,
              revenue: 50,
            },
          ],
          options: [
            {
              key: "gift",
              name: "Gift note",
              value: "Hello",
              label: "Gift note: Hello",
              quantity: 1,
            },
          ],
        })
    );

    expect(groups).toHaveLength(1);
    // productStats is only metadata fallback, never the line item quantity.
    expect(groups[0].quantity).toBe(1);
    expect(groups[0].sections).toHaveLength(1);
    expect(groups[0].sections[0].attributes).toEqual(options(["Color", "Blue"]));
    expect(groups[0].sections[0].options).toEqual(options(["Gift note", "Hello"]));
  });

  it("excludes wcpa_empty_label and default Order Insurance from legacy options", () => {
    const groups = buildOrderProductHoverGroups([
      makeProduct({
        options: [
          ...options(["Gender", "Women"], ["Size (US)", "9"]),
          {
            name: "wcpa_empty_label",
            value: "Order Insurance: Priority Processing and 100% Value Coverage ($2.75)",
          },
          {
            name: "Order Insurance",
            value: "Priority Processing and 100% Value Coverage ($2.75)",
          },
        ],
      }),
    ]);

    expect(groups[0].sections[0].options).toEqual(
      options(["Gender", "Women"], ["Size (US)", "9"])
    );
  });

  it("displays order #105639 as quantity 2 with both complete customization sets", () => {
    const wcpaFields = (customName: string, size: string, metaId: number) => [
      {
        type: "color-group",
        label: "Gender",
        value: { 1: { i: 1, label: "Women", value: "Women" } },
        meta_id: metaId,
      },
      {
        type: "color-group",
        label: "Size (US)",
        value: { 1: { i: 1, label: size, value: size } },
        meta_id: metaId + 1,
      },
      {
        type: "text",
        label: "Custom name (Optional)",
        value: customName,
        meta_id: metaId + 2,
      },
      {
        type: "checkbox-group",
        label: "wcpa_empty_label",
        value: [
          {
            i: 0,
            label: "Order Insurance: Priority Processing and 100% Value Coverage",
            value: "Order Insurance: Priority Processing and 100% Value Coverage",
          },
        ],
        meta_id: metaId + 3,
      },
    ];

    const lineItem = (id: number, customName: string, size: string, metaId: number) => ({
      id,
      product_id: 104417,
      name: SHOE_NAME,
      quantity: 1,
      meta_data: [
        {
          id: metaId,
          key: "Gender",
          display_key: "Gender",
          display_value: "■Women",
        },
        {
          id: metaId + 1,
          key: "Size (US)",
          display_key: "Size (US)",
          display_value: size,
        },
        {
          id: metaId + 2,
          key: "Custom name (Optional)",
          display_key: "Custom name (Optional)",
          display_value: customName,
        },
        {
          id: metaId + 3,
          key: "wcpa_empty_label",
          display_key: "wcpa_empty_label",
          display_value:
            "Order Insurance: Priority Processing and 100% Value Coverage ($2.75)",
        },
        {
          key: "_WCPA_order_meta_data",
          value: wcpaFields(customName, size, metaId),
        },
      ],
    });

    const products = buildOrderProducts(
      {
        line_items: [
          lineItem(157, "Julie", "9", 1681),
          lineItem(158, "Kim", "10", 1695),
        ],
      },
      "https://drovenwear.com"
    );
    const groups = buildOrderProductHoverGroups(products);

    expect(groups).toHaveLength(1);
    expect(groups[0].quantity).toBe(2);
    expect(groups[0].sections).toHaveLength(2);
    expect(groups[0].sections[0].options).toEqual(
      options(
        ["Gender", "Women"],
        ["Size (US)", "9"],
        ["Custom name (Optional)", "Julie"]
      )
    );
    expect(groups[0].sections[1].options).toEqual(
      options(
        ["Gender", "Women"],
        ["Size (US)", "10"],
        ["Custom name (Optional)", "Kim"]
      )
    );
    expect(JSON.stringify(groups)).not.toContain("Order Insurance");
    expect(JSON.stringify(groups)).not.toContain("wcpa_empty_label");
  });
});
