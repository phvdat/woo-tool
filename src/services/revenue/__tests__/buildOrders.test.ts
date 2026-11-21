import { describe, expect, it } from "vitest";
import { buildOrderProducts } from "../buildOrders";

describe("buildOrderProducts", () => {
  it("captures line item image, name and quantity", () => {
    const products = buildOrderProducts(
      {
        line_items: [
          {
            product_id: 10,
            name: "Demo Tee",
            quantity: 2,
            image: { src: "https://shop.test/tee.jpg" },
          },
        ],
      },
      "https://shop.test"
    );

    expect(products).toEqual([
      {
        productId: 10,
        name: "Demo Tee",
        image: "https://shop.test/tee.jpg",
        link: "https://shop.test/?p=10",
        quantity: 2,
      },
    ]);
  });

  it("prefers a pretty permalink from the line item", () => {
    const [product] = buildOrderProducts(
      {
        line_items: [
          {
            product_id: 10,
            name: "Demo Tee",
            quantity: 1,
            permalink: "https://shop.test/product/demo-tee/",
          },
        ],
      },
      "https://shop.test"
    );

    expect(product.link).toBe("https://shop.test/product/demo-tee/");
  });

  it("skips empty line items", () => {
    expect(buildOrderProducts({ line_items: [] })).toEqual([]);
    expect(buildOrderProducts({})).toEqual([]);
  });

  it("captures quantity, pricing, SKU and variant metadata", () => {
    const [product] = buildOrderProducts(
      {
        line_items: [
          {
            id: 501,
            product_id: 10,
            variation_id: 22,
            name: "Demo Tee - Blue / Large",
            quantity: 2,
            sku: "TEE-BL-L",
            price: "12.50",
            total: "25.00",
            meta_data: [
              {
                key: "pa_color",
                display_key: "Color",
                display_value: "Blue",
                value: "blue",
              },
              {
                key: "pa_size",
                display_key: "Size",
                display_value: "Large",
                value: "large",
              },
              { key: "_reduced_stock", value: "2" },
            ],
          },
        ],
      },
      "https://shop.test"
    );

    expect(product).toMatchObject({
      productId: 10,
      variationId: 22,
      lineItemId: 501,
      sku: "TEE-BL-L",
      unitPrice: 12.5,
      lineTotal: 25,
      quantity: 2,
      attributes: [
        { name: "Color", value: "Blue" },
        { name: "Size", value: "Large" },
      ],
    });
  });

  it("prefers a variation object when the store exposes one", () => {
    const [product] = buildOrderProducts({
      line_items: [
        {
          product_id: 10,
          variation_id: 22,
          quantity: 1,
          variation: { attribute_pa_color: "Red", attribute_size: "M" },
        },
      ],
    });

    expect(product.attributes).toEqual([
      { name: "Color", value: "Red" },
      { name: "Size", value: "M" },
    ]);
  });

  it("captures public order item options for simple products", () => {
    const [product] = buildOrderProducts({
      line_items: [
        {
          product_id: 30,
          variation_id: 0,
          name: "Simple Mug",
          quantity: 1,
          meta_data: [
            { key: "gift_note", display_key: "Gift note", value: "Hello" },
            {
              key: "Order Insurance",
              display_key: "Order Insurance",
              display_value:
                "Priority Processing and 100% Value Coverage ($2.75)",
            },
          ],
        },
      ],
    });

    expect(product.attributes).toBeUndefined();
    expect(product.variationId).toBeUndefined();
    expect(product.options).toEqual([
      { name: "Gift note", value: "Hello" },
      {
        name: "Order Insurance",
        value: "Priority Processing and 100% Value Coverage ($2.75)",
      },
    ]);
  });

  it("handles a variation with no attribute metadata gracefully", () => {
    const [product] = buildOrderProducts({
      line_items: [
        {
          product_id: 10,
          variation_id: 99,
          name: "Demo Tee",
          quantity: 1,
        },
      ],
    });

    expect(product.variationId).toBe(99);
    expect(product.attributes).toBeUndefined();
  });

  it("maps WCPA add-on fields onto the units they belong to", () => {
    const wcpa = {
      sec_unit_1: {
        extra: { form_id: "form_1" },
        fields: [
          [
            {
              type: "text",
              label: "Custom name",
              elementId: "name",
              value: "Julie",
              meta_id: 101,
            },
            {
              type: "select",
              label: "Gender",
              elementId: "gender",
              value: { 0: { i: 0, label: "Women", value: "women" } },
              meta_id: 102,
            },
          ],
        ],
      },
      sec_unit_2: {
        extra: { form_id: "form_1" },
        fields: [
          [
            {
              type: "text",
              label: "Custom name",
              elementId: "name",
              value: "Anna",
              meta_id: 103,
            },
            {
              type: "select",
              label: "Gender",
              elementId: "gender",
              value: { 0: { i: 0, label: "Women", value: "women" } },
              meta_id: 104,
            },
          ],
        ],
      },
    };

    const [product] = buildOrderProducts({
      line_items: [
        {
          product_id: 10,
          variation_id: 22,
          name: "Custom Tee",
          quantity: 2,
          meta_data: [
            {
              key: "pa_color",
              display_key: "Color",
              display_value: "Blue",
              value: "blue",
            },
            {
              key: "_WCPA_order_meta_data",
              value: JSON.stringify(wcpa),
            },
            { id: 101, key: "Custom name", value: "Julie" },
            { id: 102, key: "Gender", value: "Women" },
            { id: 103, key: "Custom name", value: "Anna" },
            { id: 104, key: "Gender", value: "Women" },
          ],
        },
      ],
    });

    expect(product.attributes).toEqual([{ name: "Color", value: "Blue" }]);
    expect(product.options).toBeUndefined();
    expect(product.units).toEqual([
      {
        index: 1,
        fields: [
          { name: "Custom name", value: "Julie" },
          { name: "Gender", value: "Women" },
        ],
      },
      {
        index: 2,
        fields: [
          { name: "Custom name", value: "Anna" },
          { name: "Gender", value: "Women" },
        ],
      },
    ]);
  });

  it("keeps shared add-on fields as options and drops flattened duplicates", () => {
    const wcpa = {
      sec_shared: {
        extra: { form_id: "form_shared" },
        fields: [
          [
            {
              type: "text",
              label: "Gift note",
              elementId: "gift",
              value: "Happy birthday",
              meta_id: 105,
            },
          ],
        ],
      },
    };

    const [product] = buildOrderProducts({
      line_items: [
        {
          product_id: 30,
          variation_id: 0,
          name: "Simple Mug",
          quantity: 1,
          meta_data: [
            { key: "_WCPA_order_meta_data", value: JSON.stringify(wcpa) },
            { id: 999, key: "Gift note", value: "Happy birthday" },
          ],
        },
      ],
    });

    expect(product.options).toEqual([
      { name: "Gift note", value: "Happy birthday" },
    ]);
    expect(product.units).toBeUndefined();
  });

  it("maps quantity-two flat WCPA fields onto their units", () => {
    const wcpa = [
      {
        type: "text",
        label: "Custom name",
        elementId: "name",
        value: "Julie",
        meta_id: 101,
      },
      {
        type: "color-group",
        label: "Gender",
        elementId: "gender",
        value: { 0: { i: 0, label: "Women", value: "Women" } },
        meta_id: 102,
      },
      {
        type: "color-group",
        label: "Size (US)",
        elementId: "size",
        value: { 0: { i: 0, label: "10", value: "10" } },
        meta_id: 103,
      },
      {
        type: "text",
        label: "Custom name",
        elementId: "name",
        value: "Kim",
        meta_id: 104,
      },
      {
        type: "color-group",
        label: "Gender",
        elementId: "gender",
        value: { 0: { i: 0, label: "Women", value: "Women" } },
        meta_id: 105,
      },
      {
        type: "color-group",
        label: "Size (US)",
        elementId: "size",
        value: { 0: { i: 0, label: "9", value: "9" } },
        meta_id: 106,
      },
    ];

    const [product] = buildOrderProducts({
      line_items: [
        {
          product_id: 10,
          variation_id: 0,
          name: "Custom Shoes",
          quantity: 2,
          meta_data: [
            { key: "_WCPA_order_meta_data", value: JSON.stringify(wcpa) },
            { id: 101, key: "Custom name", display_value: "Julie" },
            { id: 102, key: "Gender", display_value: "Women" },
            { id: 103, key: "Size (US)", display_value: "10" },
            { id: 104, key: "Custom name", display_value: "Kim" },
            { id: 105, key: "Gender", display_value: "Women" },
            { id: 106, key: "Size (US)", display_value: "9" },
            {
              id: 107,
              key: "wcpa_empty_label",
              display_value: "Order Insurance",
            },
          ],
        },
      ],
    });

    expect(product.quantity).toBe(2);
    expect(product.options).toBeUndefined();
    expect(product.units).toEqual([
      {
        index: 1,
        fields: [
          { name: "Custom name", value: "Julie" },
          { name: "Gender", value: "Women" },
          { name: "Size (US)", value: "10" },
        ],
      },
      {
        index: 2,
        fields: [
          { name: "Custom name", value: "Kim" },
          { name: "Gender", value: "Women" },
          { name: "Size (US)", value: "9" },
        ],
      },
    ]);
  });

  it("maps quantity-three WCPA sections onto their units", () => {
    const section = (name: string, size: string, id: number) => ({
      extra: { form_id: "form_1" },
      fields: [
        [
          {
            type: "text",
            label: "Custom name",
            elementId: "name",
            value: name,
            meta_id: id,
          },
          {
            type: "color-group",
            label: "Size (US)",
            elementId: "size",
            value: { 0: { i: 0, label: size, value: size } },
            meta_id: id + 1,
          },
        ],
      ],
    });
    const wcpa = {
      sec_unit_1: section("Julie", "10", 201),
      sec_unit_2: section("Kim", "9", 203),
      sec_unit_3: section("Anna", "8", 205),
    };

    const [product] = buildOrderProducts({
      line_items: [
        {
          product_id: 10,
          variation_id: 0,
          name: "Custom Shoes",
          quantity: 3,
          meta_data: [
            { key: "_WCPA_order_meta_data", value: JSON.stringify(wcpa) },
          ],
        },
      ],
    });

    expect(product.units).toEqual([
      {
        index: 1,
        fields: [
          { name: "Custom name", value: "Julie" },
          { name: "Size (US)", value: "10" },
        ],
      },
      {
        index: 2,
        fields: [
          { name: "Custom name", value: "Kim" },
          { name: "Size (US)", value: "9" },
        ],
      },
      {
        index: 3,
        fields: [
          { name: "Custom name", value: "Anna" },
          { name: "Size (US)", value: "8" },
        ],
      },
    ]);
  });

  it("falls back to options when WCPA units cannot be matched to the quantity", () => {
    const wcpa = [
      {
        type: "text",
        label: "Custom name",
        elementId: "name",
        value: "Julie",
        meta_id: 301,
      },
      {
        type: "text",
        label: "Custom name",
        elementId: "name",
        value: "Kim",
        meta_id: 302,
      },
    ];

    const [product] = buildOrderProducts({
      line_items: [
        {
          product_id: 10,
          variation_id: 0,
          name: "Custom Shoes",
          quantity: 3,
          meta_data: [
            { key: "_WCPA_order_meta_data", value: JSON.stringify(wcpa) },
          ],
        },
      ],
    });

    expect(product.units).toBeUndefined();
    expect(product.options).toEqual([
      { name: "Custom name", value: "Julie" },
      { name: "Custom name", value: "Kim" },
    ]);
  });
});
