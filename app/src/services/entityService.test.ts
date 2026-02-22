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

describe("EntityService.deleteEntity", () => {
  it("deletes DRAFT entity row", async () => {
    const repo = {
      deleteEntity: vi.fn(async () => ({ id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" })),
      insertAuditLog: vi.fn(async () => undefined),
    };
    const service = new EntityService(repo as any);
    vi.spyOn(service, "getEntityDetail").mockResolvedValue({
      entity: {
        id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        status: "DRAFT",
      },
    } as any);

    await service.deleteEntity({
      entityId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      groupId: "44444444-4444-4444-4444-444444444444",
      currentUserId: "22222222-2222-2222-2222-222222222222",
    });

    expect(repo.deleteEntity).toHaveBeenCalledWith(
      "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      "44444444-4444-4444-4444-444444444444",
    );
  });
});

describe("EntityService.resolveAssignmentIdForKey", () => {
  it("infers product from selected serial_number key", async () => {
    const repo = {};
    const productsRepo = {
      getSerialNumberById: vi.fn(async () => ({
        id: "serial-1",
        productId: "prod-1",
        serialNo: "SN-000001",
        valid: true,
      })),
    };
    const service = new EntityService(repo as any, productsRepo as any);

    const assignmentId = await service.resolveAssignmentIdForKey({
      keyKind: "serial",
      keyId: "serial-1",
    });

    expect(assignmentId).toBe("prod-1");
  });
});

describe("EntityService.approveEntity", () => {
  it("finalizes selected batch key on approve", async () => {
    const repo = {
      updateEntityStatus: vi.fn(async () => undefined),
      insertApproval: vi.fn(async () => undefined),
      insertAuditLog: vi.fn(async () => undefined),
    };
    const productsRepo = {
      finalizeBatch: vi.fn(async () => ({ id: "batch-1" })),
      finalizeSerialNumber: vi.fn(async () => null),
      finalizeCustomerOrder: vi.fn(async () => null),
    };
    const service = new EntityService(repo as any, productsRepo as any);
    vi.spyOn(service, "getEntityDetail").mockResolvedValue({
      entity: {
        id: "entity-1",
        status: "SUBMITTED",
        dataJson: { batch_id: "batch-1" },
      } as any,
      template: {
        type: "BATCH_PRODUCTION_ORDER",
        assignmentField: "product_id",
        keyField: "batch_id",
      },
    } as any);

    await service.approveEntity({
      entityId: "entity-1",
      groupId: "group-1",
      currentUserId: "user-1",
    });

    expect(productsRepo.finalizeBatch).toHaveBeenCalledWith("batch-1");
    expect(repo.updateEntityStatus).toHaveBeenCalledWith("entity-1", "APPROVED_FINAL");
  });
});
