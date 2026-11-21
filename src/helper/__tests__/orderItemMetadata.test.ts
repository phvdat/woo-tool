import { describe, expect, it } from "vitest";
import {
  extractWcpaOrderMeta,
  groupWcpaMetadata,
  humanizeMetadataKey,
  isInternalMetadataKey,
  normalizeMetadataPairs,
  sanitizeMetadataText,
} from "../orderItemMetadata";

describe("order item metadata formatting", () => {
  it("decodes HTML entities and strips decorative symbols", () => {
    expect(
      normalizeMetadataPairs([
        {
          key: "pa_size",
          display_key: "&#9632; Size",
          display_value: "&#8211; L &amp; XL",
        },
      ])
    ).toEqual([{ name: "Size", value: "– L & XL" }]);

    expect(sanitizeMetadataText("<span>&#9632; Black</span>")).toBe("Black");
  });

  it("humanizes technical keys and camelCase", () => {
    expect(humanizeMetadataKey("attribute_pa_shirt_size")).toBe("Shirt Size");
    expect(humanizeMetadataKey("orderInsurance")).toBe("Order Insurance");
    expect(humanizeMetadataKey("personalization_text")).toBe(
      "Personalization Text"
    );
  });

  it("filters generic internal metadata keys", () => {
    expect(isInternalMetadataKey("_reduced_stock")).toBe(true);
    expect(isInternalMetadataKey("variation_id")).toBe(true);
    expect(isInternalMetadataKey("line_total")).toBe(true);
    expect(isInternalMetadataKey("wcpa_empty_label")).toBe(true);
    expect(isInternalMetadataKey("gift_note")).toBe(false);
    expect(isInternalMetadataKey("pa_size")).toBe(false);

    expect(
      normalizeMetadataPairs([
        { key: "_reduced_stock", value: "2" },
        { key: "variation_id", value: "22" },
        { key: "product_id", value: "10" },
        { key: "line_total", value: "20" },
        { key: "shirt_size", value: "L" },
      ])
    ).toEqual([{ name: "Shirt Size", value: "L" }]);
  });

  it("derives a readable label when the display label is missing", () => {
    expect(
      normalizeMetadataPairs([{ key: "order_insurance", value: "Included" }])
    ).toEqual([{ name: "Order Insurance", value: "Included" }]);
  });

  it("falls back when display labels or values are empty", () => {
    expect(
      normalizeMetadataPairs([
        {
          key: "color",
          display_key: "",
          display_value: "",
          value: "Black",
        },
      ])
    ).toEqual([{ name: "Color", value: "Black" }]);
  });

  it("skips entries without a usable label or value", () => {
    expect(
      normalizeMetadataPairs([
        { key: "", value: "orphan" },
        { key: "empty_value", value: "" },
      ])
    ).toEqual([]);
  });

  it("formats arrays without dropping values", () => {
    expect(
      normalizeMetadataPairs([{ key: "sizes", value: ["S", "M", "L"] }])
    ).toEqual([{ name: "Sizes", value: "S, M, L" }]);
  });

  it("formats nested objects as readable entries", () => {
    expect(
      normalizeMetadataPairs([
        {
          key: "personalization",
          value: { name: "John", font: "Arial" },
        },
      ])
    ).toEqual([{ name: "Personalization", value: "Name: John; Font: Arial" }]);
  });

  it("prefers nested display labels and values", () => {
    expect(
      normalizeMetadataPairs([
        {
          key: "personalization",
          value: { label: "Text", value: "John" },
        },
      ])
    ).toEqual([{ name: "Personalization", value: "Text: John" }]);
  });

  it("handles variation arrays and object maps", () => {
    expect(
      normalizeMetadataPairs([
        { name: "Size", option: "L" },
        { attribute: "Type", value: "Adult" },
      ])
    ).toEqual([
      { name: "Size", value: "L" },
      { name: "Type", value: "Adult" },
    ]);

    expect(
      normalizeMetadataPairs({
        attribute_pa_color: "Black",
        attribute_size: "L",
      })
    ).toEqual([
      { name: "Color", value: "Black" },
      { name: "Size", value: "L" },
    ]);
  });

  it("deduplicates identical label/value pairs", () => {
    expect(
      normalizeMetadataPairs([
        { key: "color", value: "Black" },
        { key: "color", value: "Black" },
        { key: "color", value: "White" },
      ])
    ).toEqual([
      { name: "Color", value: "Black" },
      { name: "Color", value: "White" },
    ]);
  });

  it("preserves prices and special characters in values", () => {
    expect(
      normalizeMetadataPairs([
        {
          key: "Order Insurance",
          display_key: "Order Insurance",
          display_value:
            "Priority Processing and 100% Value Coverage ($2.75)",
        },
      ])
    ).toEqual([
      {
        name: "Order Insurance",
        value: "Priority Processing and 100% Value Coverage ($2.75)",
      },
    ]);
  });
});

function wcpaField(overrides: Record<string, unknown>) {
  return {
    type: "text",
    name: "field",
    label: "Field",
    elementId: "element",
    value: "",
    clStatus: "normal",
    meta_id: 1,
    ...overrides,
  };
}

function wcpaSection(formId: string, fields: Record<string, unknown>[]) {
  return {
    extra: { form_id: formId },
    fields: [fields],
  };
}

describe("WCPA order metadata grouping", () => {
  it("extracts the WCPA payload and its field meta ids", () => {
    const meta = [
      { key: "_WCPA_order_meta_data", value: JSON.stringify({ s1: wcpaSection("form_1", [wcpaField({ meta_id: 101 })]) }) },
      { id: 101, key: "Custom name", value: "Julie" },
    ];

    const extracted = extractWcpaOrderMeta(meta);

    expect(extracted?.metaIds).toEqual([101]);
    expect(extracted?.value).toMatchObject({ s1: expect.any(Object) });
    expect(extractWcpaOrderMeta([{ key: "gift_note", value: "Hello" }])).toBeNull();
  });

  it("groups repeated form sections into units and keeps shared sections separate", () => {
    const value = {
      sec_unit_1: wcpaSection("form_1", [
        wcpaField({ label: "Custom name", value: "Julie", elementId: "name", meta_id: 101 }),
        wcpaField({
          type: "select",
          label: "Gender",
          elementId: "gender",
          meta_id: 102,
          value: { 0: { i: 0, label: "Women", value: "women" } },
        }),
      ]),
      sec_unit_2: wcpaSection("form_1", [
        wcpaField({ label: "Custom name", value: "Anna", elementId: "name", meta_id: 103 }),
        wcpaField({
          type: "select",
          label: "Gender",
          elementId: "gender",
          meta_id: 104,
          value: { 0: { i: 0, label: "Women", value: "women" } },
        }),
      ]),
      sec_shared: wcpaSection("form_shared", [
        wcpaField({ label: "Gift note", value: "Happy birthday", elementId: "gift", meta_id: 105 }),
      ]),
    };

    expect(groupWcpaMetadata(value, 2)).toEqual({
      shared: [{ name: "Gift note", value: "Happy birthday" }],
      units: [
        {
          index: 1,
          pairs: [
            { name: "Custom name", value: "Julie" },
            { name: "Gender", value: "Women" },
          ],
        },
        {
          index: 2,
          pairs: [
            { name: "Custom name", value: "Anna" },
            { name: "Gender", value: "Women" },
          ],
        },
      ],
    });
  });

  it("groups repeated fields inside one section by occurrence", () => {
    const value = {
      only: wcpaSection("form_1", [
        wcpaField({ label: "Name", value: "Julie", elementId: "name", meta_id: 1 }),
        wcpaField({ label: "Size", value: "10", elementId: "size", meta_id: 2 }),
        wcpaField({ label: "Name", value: "Anna", elementId: "name", meta_id: 3 }),
        wcpaField({ label: "Size", value: "12", elementId: "size", meta_id: 4 }),
      ]),
    };

    expect(groupWcpaMetadata(value, 2).units).toEqual([
      { index: 1, pairs: [{ name: "Name", value: "Julie" }, { name: "Size", value: "10" }] },
      { index: 2, pairs: [{ name: "Name", value: "Anna" }, { name: "Size", value: "12" }] },
    ]);
  });

  it("treats scalar arrays matching the quantity as per-unit values", () => {
    const value = {
      only: wcpaSection("form_1", [
        wcpaField({ label: "Custom name", elementId: "name", value: ["Julie", "Anna"] }),
      ]),
    };

    expect(groupWcpaMetadata(value, 2).units).toEqual([
      { index: 1, pairs: [{ name: "Custom name", value: "Julie" }] },
      { index: 2, pairs: [{ name: "Custom name", value: "Anna" }] },
    ]);
  });

  it("never splits option arrays into units", () => {
    const value = {
      only: wcpaSection("form_1", [
        wcpaField({
          type: "select",
          label: "Color",
          elementId: "color",
          value: [
            { i: 0, label: "Red", value: "red" },
            { i: 1, label: "Blue", value: "blue" },
          ],
        }),
      ]),
    };

    expect(groupWcpaMetadata(value, 2)).toEqual({
      shared: [{ name: "Color", value: "Red, Blue" }],
      units: [],
    });
  });

  it("falls back to a flat list when occurrences are ambiguous", () => {
    const value = {
      only: wcpaSection("form_1", [
        wcpaField({ label: "Name", value: "Julie", elementId: "name", meta_id: 1 }),
        wcpaField({ label: "Name", value: "Anna", elementId: "name", meta_id: 2 }),
      ]),
    };

    const result = groupWcpaMetadata(value, 3);

    expect(result.units).toEqual([]);
    expect(result.shared).toEqual([
      { name: "Name", value: "Julie" },
      { name: "Name", value: "Anna" },
    ]);
  });

  it("ignores unlabeled WCPA fields, hidden fields and empty values", () => {
    const value = {
      only: wcpaSection("form_1", [
        wcpaField({ label: "wcpa_empty_label", value: "hidden label" }),
        wcpaField({ label: "Hidden", value: "secret", clStatus: "hidden" }),
        wcpaField({ label: "Empty", value: "" }),
        wcpaField({ type: "content", label: "Heading", value: "Welcome" }),
      ]),
    };

    expect(groupWcpaMetadata(value, 1)).toEqual({ shared: [], units: [] });
  });

  it("keeps empty optional fields inside their unit instead of sharing them", () => {
    const value = {
      sec_unit_1: wcpaSection("form_1", [
        wcpaField({ label: "Custom name", value: "Julie", elementId: "name", meta_id: 1 }),
        wcpaField({ label: "Note", value: "Hi", elementId: "note", meta_id: 2 }),
      ]),
      sec_unit_2: wcpaSection("form_1", [
        wcpaField({ label: "Custom name", value: "Anna", elementId: "name", meta_id: 3 }),
        wcpaField({ label: "Note", value: "", elementId: "note", meta_id: 4 }),
      ]),
    };

    expect(groupWcpaMetadata(value, 2)).toEqual({
      shared: [],
      units: [
        {
          index: 1,
          pairs: [
            { name: "Custom name", value: "Julie" },
            { name: "Note", value: "Hi" },
          ],
        },
        {
          index: 2,
          pairs: [{ name: "Custom name", value: "Anna" }],
        },
      ],
    });
  });

  it("keeps quantity-one orders flat", () => {
    const value = {
      only: wcpaSection("form_1", [
        wcpaField({ label: "Custom name", value: "Julie", elementId: "name" }),
      ]),
    };

    expect(groupWcpaMetadata(value, 1)).toEqual({
      shared: [{ name: "Custom name", value: "Julie" }],
      units: [],
    });
  });
});
