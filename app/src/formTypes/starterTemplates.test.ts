import { describe, expect, it } from "vitest";

import { getStarterTemplate } from "./starterTemplates.js";

describe("getStarterTemplate", () => {
  it("returns batch production starter with product_id + batch_id", async () => {
    const tpl = await getStarterTemplate("BATCH_PRODUCTION_ORDER");
    const keys = (tpl.fieldDefsJson as Array<{ key: string }>).map((f) => f.key);
    expect(keys).toContain("product_id");
    expect(keys).toContain("batch_id");
  });

  it("returns serial production starter with serial_number_id", async () => {
    const tpl = await getStarterTemplate("SERIAL_PRODUCTION_ORDER");
    const keys = (tpl.fieldDefsJson as Array<{ key: string }>).map((f) => f.key);
    expect(keys).toContain("product_id");
    expect(keys).toContain("serial_number_id");
  });

  it("returns customer order starter with customer_id + customer_order_id", async () => {
    const tpl = await getStarterTemplate("CUSTOMER_ORDER");
    const keys = (tpl.fieldDefsJson as Array<{ key: string }>).map((f) => f.key);
    expect(keys).toContain("customer_id");
    expect(keys).toContain("customer_order_id");
  });
});
