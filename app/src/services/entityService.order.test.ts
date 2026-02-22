import { describe, expect, it, vi } from "vitest";

import { EntityService } from "./entityService.js";

describe("EntityService.startByFormType", () => {
  it("creates batch production entity with id + snapshot header payload", async () => {
    const repo = {
      getTemplateById: vi.fn(async () => ({
        id: "tpl-1",
        templateType: "BATCH_PRODUCTION_ORDER",
        assignmentField: "product_id",
        keyField: "batch_id",
      })),
      getActiveTestVersionForTemplate: vi.fn(async () => ({ id: "ver-1" })),
      insertEntity: vi.fn(async () => "entity-1"),
    };
    const productsRepo = {
      getProductById: vi.fn(async () => ({ id: "prod-1", name: "Alpha Basic", valid: true })),
      getBatchById: vi.fn(async () => ({
        id: "batch-1",
        productId: "prod-1",
        code: "ALPHA-001",
        valid: true,
      })),
    };
    const service = new EntityService(repo as any, productsRepo as any);

    const entityId = await service.startByFormType({
      groupId: "group-1",
      templateId: "tpl-1",
      formType: "BATCH_PRODUCTION_ORDER",
      assignmentId: "prod-1",
      keyId: "batch-1",
      currentUserId: "user-1",
    });

    expect(entityId).toBe("entity-1");
    expect(repo.insertEntity).toHaveBeenCalledWith({
      templateId: "tpl-1",
      templateVersionId: "ver-1",
      ownerGroupId: "group-1",
      createdBy: "user-1",
      dataJson: {
        _header: {
          assignment: { type: "product", id: "prod-1", label: "Alpha Basic" },
          key: { type: "batch", id: "batch-1", label: "ALPHA-001" },
        },
        product_id: "prod-1",
        batch_id: "batch-1",
        product_name: "Alpha Basic",
        batch_code: "ALPHA-001",
      },
    });
  });

  it("creates customer order entity with id + snapshot header payload", async () => {
    const repo = {
      getTemplateById: vi.fn(async () => ({
        id: "tpl-c-1",
        templateType: "CUSTOMER_ORDER",
        assignmentField: "customer_id",
        keyField: "customer_order_id",
      })),
      getActiveTestVersionForTemplate: vi.fn(async () => ({ id: "ver-c-1" })),
      insertEntity: vi.fn(async () => "entity-c-1"),
    };
    const productsRepo = {
      getCustomerById: vi.fn(async () => ({
        id: "cust-1",
        name: "Acme Corp",
        valid: true,
      })),
      getCustomerOrderById: vi.fn(async () => ({
        id: "co-1",
        customerId: "cust-1",
        orderNo: "CO-1001",
        valid: true,
      })),
    };
    const service = new EntityService(repo as any, productsRepo as any);

    const entityId = await service.startByFormType({
      groupId: "group-1",
      templateId: "tpl-c-1",
      formType: "CUSTOMER_ORDER",
      assignmentId: "cust-1",
      keyId: "co-1",
      currentUserId: "user-1",
    });

    expect(entityId).toBe("entity-c-1");
    expect(repo.insertEntity).toHaveBeenCalledWith({
      templateId: "tpl-c-1",
      templateVersionId: "ver-c-1",
      ownerGroupId: "group-1",
      createdBy: "user-1",
      dataJson: {
        _header: {
          assignment: { type: "customer", id: "cust-1", label: "Acme Corp" },
          key: { type: "customer_order", id: "co-1", label: "CO-1001" },
        },
        customer_id: "cust-1",
        customer_order_id: "co-1",
        customer_name: "Acme Corp",
        order_no: "CO-1001",
      },
    });
  });
});
