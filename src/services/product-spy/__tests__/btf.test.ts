import { describe, expect, it } from "vitest";
import { parseBtfShopProducts, parseBtfTotalPages } from "../btf";

const html = `
<script>
config:$R[1]={site:{name:"Store",nested:{value:1}},currency:"USD"};
products:$R[2]=[
  $R[3]={id:101,name:"Alpha \\"Quoted\\" Tee",path:"/product/alpha-tee/",image:"https://cdn.example.com/a.jpg",price:"19.99",regular:"29.99",needs_options:!0,variable:!1},
  $R[4]={id:102,name:"Beta Hoodie",path:"/product/beta-hoodie/",image:null,price:"39.99",regular:"49.99"},
  $R[5]={id:101,name:"Alpha duplicate",path:"/product/alpha-copy/",price:"19.99"}
],total:25,page:1,pages:2,orderby:"menu_order";
</script>`;

describe("parseBtfShopProducts", () => {
  it("extracts product fields and ignores nested config objects", () => {
    const products = parseBtfShopProducts(html, "https://store.example");
    expect(products).toHaveLength(2);
    expect(products[0]).toMatchObject({
      externalId: "101",
      title: 'Alpha "Quoted" Tee',
      url: "https://store.example/product/alpha-tee/",
      slug: "alpha-tee",
      price: "19.99",
      image: "https://cdn.example.com/a.jpg",
      source: "btf",
    });
  });

  it("deduplicates by external id", () => {
    const products = parseBtfShopProducts(html, "https://store.example");
    expect(products.map((p) => p.externalId)).toEqual(["101", "102"]);
  });

  it("keeps products without an image", () => {
    const products = parseBtfShopProducts(html, "https://store.example");
    const beta = products.find((p) => p.externalId === "102");
    expect(beta?.image).toBeUndefined();
    expect(beta?.images).toEqual([]);
  });
});

describe("parseBtfTotalPages", () => {
  it("reads the serialized pagination count", () => {
    expect(parseBtfTotalPages(html)).toBe(2);
  });

  it("returns null when pagination is absent", () => {
    expect(parseBtfTotalPages("<html></html>")).toBeNull();
  });
});
