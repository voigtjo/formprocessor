import { describe, expect, it, vi } from "vitest";

import { TemplateService } from "./templateService.js";

describe("TemplateService.createTemplate", () => {
  it("initializes PRODUCTION_ORDER_SERIAL with non-empty starter TEST JSON", async () => {
    const repo = {
      getDefaultGroupId: vi.fn(async () => "44444444-4444-4444-4444-444444444444"),
      createTemplate: vi.fn(async () => "11111111-1111-1111-1111-111111111111"),
    } as any;

    const service = new TemplateService(repo);

    await service.createTemplate({
      key: "serial-order",
      name: "Serial Order",
      templateType: "PRODUCTION_ORDER_SERIAL",
      currentUserId: "22222222-2222-2222-2222-222222222222",
    });

    expect(repo.createTemplate).toHaveBeenCalledOnce();
    const payload = repo.createTemplate.mock.calls[0][0];
    expect(payload.templateType).toBe("PRODUCTION_ORDER_SERIAL");
    expect(payload.assignmentField).toBe("product_id");
    expect(payload.keyField).toBe("serial_no");
    expect(Array.isArray(payload.initialFieldDefsJson)).toBe(true);
    expect(payload.initialFieldDefsJson.length).toBeGreaterThan(0);
    expect(payload.initialLayoutJson).toBeTruthy();
    expect(Array.isArray(payload.initialLayoutJson.sections)).toBe(true);
  });
});
