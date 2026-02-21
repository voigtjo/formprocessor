import { describe, expect, it } from "vitest";

import { renderForm } from "./renderer.js";
import type { FieldDef, LayoutJson } from "./syntax.js";

const fieldDefs: FieldDef[] = [
  {
    key: "name",
    type: "string",
    label: "Name",
    semantic: "WRITABLE_ENTITY",
    readonly: false,
    required: true,
  },
  {
    key: "externalId",
    type: "string",
    label: "External ID",
    semantic: "READONLY_EXTERNAL",
    readonly: true,
    required: false,
  },
];

const layout: LayoutJson = {
  title: "Test Form",
  sections: [
    {
      title: "Main",
      rows: [{ cols: [{ field: "name" }, { field: "externalId" }] }],
    },
  ],
};

describe("renderForm", () => {
  it("renders required marker", async () => {
    const html = await renderForm(layout, fieldDefs, { name: "Alice", externalId: "ext-1" }, false);
    expect(html).toContain("Name *");
  });

  it("renders readonly fields as disabled inputs", async () => {
    const html = await renderForm(layout, fieldDefs, { name: "Alice", externalId: "ext-1" }, false);
    expect(html).toContain('name="externalId"');
    expect(html).toContain("disabled");
  });

  it("renders READONLY_EXTERNAL field from layout with disabled input", async () => {
    const defs: FieldDef[] = [
      {
        key: "product_id",
        type: "string",
        label: "Product",
        semantic: "READONLY_EXTERNAL",
        readonly: false,
        required: false,
        lookup: {
          kind: "api",
          url: "/api/products?valid=true",
          valueField: "id",
          labelField: "name",
        },
      },
    ];
    const formLayout: LayoutJson = {
      title: "Order",
      sections: [{ title: "Main", rows: [{ cols: [{ field: "product_id" }] }] }],
    };

    const html = await renderForm(
      formLayout,
      defs,
      { product_id: "p1" },
      false,
      async () => [
        { value: "p1", label: "Alpha Basic" },
        { value: "p2", label: "Beta Plus" },
      ],
    );
    expect(html).toContain("Product");
    expect(html).toContain('name="product_id"');
    expect(html).toContain("<select");
    expect(html).toContain("disabled");
  });
});
