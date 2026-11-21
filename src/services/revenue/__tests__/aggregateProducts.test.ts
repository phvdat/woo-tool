import { describe, expect, it } from "vitest";
import {
  aggregateProductStats,
  buildProductStatKey,
} from "../aggregateProducts";

const simpleProduct = {
  productId: 10,
  name: "Demo Tee",
  image: "",
  link: "",
  quantity: 2,
  lineItemId: 1,
  unitPrice: 10,
  lineTotal: 20,
  sku: "TEE",
};

const blueLarge = {
  productId: 20,
  name: "Variable Tee",
  image: "",
  link: "",
  quantity: 1,
  lineItemId: 2,
  variationId: 201,
  unitPrice: 15,
  lineTotal: 15,
  sku: "VAR-BL-L",
  attributes: [
    { name: "Color", value: "Blue" },
    { name: "Size", value: "Large" },
  ],
};

const blueMedium = {
  productId: 20,
  name: "Variable Tee",
  image: "",
  link: "",
  quantity: 3,
  lineItemId: 3,
  variationId: 202,
  unitPrice: 15,
  lineTotal: 45,
  sku: "VAR-BL-M",
  attributes: [
    { name: "Color", value: "Blue" },
    { name: "Size", value: "Medium" },
  ],
};

describe("aggregateProductStats", () => {
  it("aggregates quantity, revenue and weighted unit price per product", () => {
    const stats = aggregateProductStats([
      {
        id: 1,
        websiteId: "site-a",
        products: [simpleProduct, { ...simpleProduct, lineItemId: 4, quantity: 1, lineTotal: 15, unitPrice: 15 }],
      },
      {
        id: 2,
        websiteId: "site-a",
        products: [{ ...simpleProduct, lineItemId: 5, quantity: 2, lineTotal: 20 }],
      },
    ]);

    const stat = stats.find(
      (item) =>
        item.key === buildProductStatKey("site-a", simpleProduct.productId, simpleProduct.name)
    );

    expect(stat).toMatchObject({
      quantity: 5,
      revenue: 55,
      orders: 2,
      isVariable: false,
      sku: "TEE",
      variants: [],
    });
    expect(stat?.unitPrice).toBeCloseTo(11);
  });

  it("groups variants by the full attribute combination", () => {
    const stats = aggregateProductStats([
      {
        id: 1,
        websiteId: "site-a",
        products: [blueLarge, blueMedium],
      },
      {
        id: 2,
        websiteId: "site-a",
        products: [{ ...blueLarge, lineItemId: 6, quantity: 2, lineTotal: 30 }],
      },
    ]);

    const stat = stats.find((item) => item.productId === 20);

    expect(stat).toMatchObject({
      quantity: 6,
      revenue: 90,
      orders: 2,
      isVariable: true,
    });
    expect(stat?.variants).toEqual([
      {
        key: expect.any(String),
        label: "Blue / Large",
        attributes: [
          { name: "Color", value: "Blue" },
          { name: "Size", value: "Large" },
        ],
        quantity: 3,
        revenue: 45,
        sku: "VAR-BL-L",
      },
      {
        key: expect.any(String),
        label: "Blue / Medium",
        attributes: [
          { name: "Color", value: "Blue" },
          { name: "Size", value: "Medium" },
        ],
        quantity: 3,
        revenue: 45,
        sku: "VAR-BL-M",
      },
    ]);
  });

  it("does not count the same order or line item twice", () => {
    const order = {
      id: 1,
      websiteId: "site-a",
      products: [simpleProduct],
    };

    const stats = aggregateProductStats([order, order]);

    expect(stats).toHaveLength(1);
    expect(stats[0]).toMatchObject({ quantity: 2, revenue: 20, orders: 1 });
  });

  it("keeps products from different websites separate", () => {
    const product = { ...simpleProduct, lineItemId: 1 };
    const stats = aggregateProductStats([
      { id: 1, websiteId: "site-a", products: [product] },
      { id: 1, websiteId: "site-b", products: [product] },
    ]);

    expect(stats).toHaveLength(2);
    expect(stats.map((item) => item.websiteId).sort()).toEqual([
      "site-a",
      "site-b",
    ]);
  });

  it("marks a variation without attribute metadata as variable", () => {
    const stats = aggregateProductStats([
      {
        id: 1,
        websiteId: "site-a",
        products: [
          {
            ...simpleProduct,
            productId: 30,
            variationId: 301,
            attributes: undefined,
          },
        ],
      },
    ]);

    expect(stats[0]).toMatchObject({
      isVariable: true,
      variants: [],
      quantity: 2,
    });
  });

  it("aggregates additional order item options by name and value", () => {
    const insuredProduct = {
      ...simpleProduct,
      productId: 40,
      name: "Insured Mug",
      options: [
        {
          name: "Order Insurance",
          value: "Priority Processing and 100% Value Coverage ($2.75)",
        },
      ],
    };

    const stats = aggregateProductStats([
      {
        id: 1,
        websiteId: "site-a",
        products: [{ ...insuredProduct, lineItemId: 7, quantity: 1 }],
      },
      {
        id: 2,
        websiteId: "site-a",
        products: [{ ...insuredProduct, lineItemId: 8, quantity: 2 }],
      },
    ]);

    expect(stats[0]).toMatchObject({
      productId: 40,
      quantity: 3,
      isVariable: false,
      variants: [],
      options: [
        {
          key: "order insurance:priority processing and 100% value coverage ($2.75)",
          name: "Order Insurance",
          value: "Priority Processing and 100% Value Coverage ($2.75)",
          label:
            "Order Insurance: Priority Processing and 100% Value Coverage ($2.75)",
          quantity: 3,
        },
      ],
    });
  });
});
