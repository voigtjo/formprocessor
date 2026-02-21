import { describe, expect, it } from "vitest";

import { getStarterTemplate } from "./starterTemplates.js";

describe("getStarterTemplate", () => {
  it("returns batch production starter with product_id + batch_id", async () => {
    const repo = { getByTemplateType: async () => null } as any;
    const tpl = await getStarterTemplate("PRODUCTION_ORDER_BATCH", repo);
    const keys = (tpl.fieldDefsJson as Array<{ key: string }>).map((f) => f.key);
    expect(keys).toContain("product_id");
    expect(keys).toContain("batch_id");
  });

  it("returns serial production starter with product_id + serial_no", async () => {
    const repo = { getByTemplateType: async () => null } as any;
    const tpl = await getStarterTemplate("PRODUCTION_ORDER_SERIAL", repo);
    const keys = (tpl.fieldDefsJson as Array<{ key: string }>).map((f) => f.key);
    expect(keys).toContain("product_id");
    expect(keys).toContain("serial_no");
  });

  it("returns customer order starter with customer_id + customer_order_id", async () => {
    const repo = { getByTemplateType: async () => null } as any;
    const tpl = await getStarterTemplate("CUSTOMER_ORDER", repo);
    const keys = (tpl.fieldDefsJson as Array<{ key: string }>).map((f) => f.key);
    expect(keys).toContain("customer_id");
    expect(keys).toContain("customer_order_id");
  });
});
