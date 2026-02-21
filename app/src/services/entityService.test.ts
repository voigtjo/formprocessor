import { describe, expect, it, vi } from "vitest";

import { EntityService } from "./entityService.js";
import type { FieldDef, LayoutJson } from "../forms/syntax.js";

describe("EntityService.saveEntityDataFromForm", () => {
  it("persists product_id in entities.data_json", async () => {
    const repo = {
      updateEntityDataJson: vi.fn(async () => undefined),
    };
    const service = new EntityService(repo as any);

    const fieldDefs: FieldDef[] = [
      {
        key: "product_id",
        type: "string",
        label: "Product",
        semantic: "WRITABLE_ENTITY",
        readonly: false,
        required: true,
        lookup: {
          kind: "api",
          url: "/api/products?valid=true",
          valueField: "id",
          labelField: "name",
        },
      },
    ];
    const layout: LayoutJson = {
      title: "Order",
      sections: [{ title: "Main", rows: [{ cols: [{ field: "product_id" }] }] }],
    };

    vi.spyOn(service, "getEntityDetail").mockResolvedValue({
      entity: {
        id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        status: "DRAFT",
        dataJson: {},
      } as any,
      templateVersion: {} as any,
      template: { name: "Invoice Template", key: "invoice" },
      version: { channel: "TEST", major: 1, minor: 0, patch: 0 },
      fieldDefs,
      layout,
      values: {},
      approvals: [],
    } as any);

    await service.saveEntityDataFromForm({
      entityId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      groupId: "44444444-4444-4444-4444-444444444444",
      postedValues: { product_id: "11111111-1111-1111-1111-111111111111" },
    });

    expect(repo.updateEntityDataJson).toHaveBeenCalledWith("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", {
      product_id: "11111111-1111-1111-1111-111111111111",
    });
  });
});

