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
});
