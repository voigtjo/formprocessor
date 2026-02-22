import Fastify from "fastify";
import formbody from "@fastify/formbody";
import { describe, expect, it, vi } from "vitest";

import { registerUiRoutes } from "./ui.js";
import type { TemplateService } from "../services/templateService.js";
import type { EntityService } from "../services/entityService.js";
import type { GroupRole } from "../rbac/rbac.js";

const TEMPLATE_ID = "11111111-1111-1111-1111-111111111111";
const ENTITY_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const MANAGER_USER_ID = "22222222-2222-2222-2222-222222222222";
const MEMBER_USER_ID = "33333333-3333-3333-3333-333333333333";
const DEFAULT_GROUP_ID = "44444444-4444-4444-4444-444444444444";

function buildTestApp(userId: string, role: GroupRole) {
  const templateService = {
    getDefaultGroupId: vi.fn(async () => DEFAULT_GROUP_ID),
    createTemplate: vi.fn(async () => TEMPLATE_ID),
    saveLatestTestJson: vi.fn(async () => undefined),
    publishTest: vi.fn(async () => undefined),
    publishProd: vi.fn(async () => undefined),
    updateTemplateHeaderConfig: vi.fn(async () => undefined),
    deleteTemplate: vi.fn(async () => undefined),
    listTemplatesForUserDefaultGroup: vi.fn(async () => []),
    getTemplateDetail: vi.fn(async () => ({
      template: {
        id: TEMPLATE_ID,
        key: "tpl",
        name: "Template",
        templateType: "BATCH_PRODUCTION_ORDER",
        createdAt: new Date(),
      },
      versions: [],
    })),
  } as unknown as TemplateService;

  const requireGroupRoleFn = vi.fn(async (args: { allowed: GroupRole[] }) => {
    if (!args.allowed.includes(role)) {
      const err: any = new Error("RBAC denied");
      err.statusCode = 403;
      throw err;
    }
    return role;
  });

  const entityService = {
    listEntitiesForGroup: vi.fn(async () => []),
    listStartableTemplates: vi.fn(async () => []),
    listOrderEntitiesForGroup: vi.fn(async () => []),
    listStartableOrderTemplates: vi.fn(async () => []),
    listCustomerOrderEntitiesForGroup: vi.fn(async () => []),
    listStartableCustomerOrderTemplates: vi.fn(async () => []),
    getEntityDetail: vi.fn(async () => ({ entity: null, fieldDefs: [], layout: { title: "", sections: [] }, values: {} })),
    saveEntityDataFromForm: vi.fn(async () => undefined),
    startEntity: vi.fn(async () => ENTITY_ID),
    startOrder: vi.fn(async () => ENTITY_ID),
    startCustomerOrder: vi.fn(async () => ENTITY_ID),
    startByFormType: vi.fn(async () => ENTITY_ID),
    submitEntity: vi.fn(async () => undefined),
    approveEntity: vi.fn(async () => undefined),
    rejectEntity: vi.fn(async () => undefined),
    deleteEntity: vi.fn(async () => undefined),
    finalizeEntityKey: vi.fn(async () => undefined),
  } as unknown as EntityService;

  const app = Fastify();
  app.register(formbody);
  app.addHook("preHandler", async (req) => {
    req.currentUser = { id: userId, email: "test@local" };
  });
  registerUiRoutes(app, {
    templateService,
    entityService,
    requireGroupRoleFn,
  });

  return { app, templateService, entityService, requireGroupRoleFn };
}

async function post(app: any, url: string) {
  return app.inject({ method: "POST", url });
}

async function postForm(app: any, url: string, payload: Record<string, string>) {
  return app.inject({
    method: "POST",
    url,
    headers: { "content-type": "application/x-www-form-urlencoded" },
    payload: new URLSearchParams(payload).toString(),
  });
}

describe("POST /ui-actions/forms", () => {
  it("allows MANAGER", async () => {
    const { app, templateService } = buildTestApp(MANAGER_USER_ID, "MANAGER");
    await app.ready();

    const res = await postForm(app, "/ui-actions/forms", { key: "invoice", name: "Invoice" });

    expect(res.statusCode).toBe(303);
    expect(res.headers.location).toBe(`/ui/forms/${TEMPLATE_ID}`);
    expect(templateService.createTemplate).toHaveBeenCalledOnce();
    await app.close();
  });

  it("denies MEMBER with 403", async () => {
    const { app, templateService } = buildTestApp(MEMBER_USER_ID, "MEMBER");
    await app.ready();

    const res = await postForm(app, "/ui-actions/forms", { key: "invoice", name: "Invoice" });

    expect(res.statusCode).toBe(403);
    expect(templateService.createTemplate).not.toHaveBeenCalled();
    await app.close();
  });
});

describe("POST /ui-actions/forms/:id/save-test", () => {
  it("allows MANAGER", async () => {
    const { app, templateService } = buildTestApp(MANAGER_USER_ID, "MANAGER");
    await app.ready();

    const res = await postForm(app, `/ui-actions/forms/${TEMPLATE_ID}/save-test`, {
      field_defs_json: '[{"name":"firstName"}]',
      layout_json: '{"grid":12}',
      rules_json: '["required:firstName"]',
    });

    expect(res.statusCode).toBe(303);
    expect(res.headers.location).toBe(`/ui/forms/${TEMPLATE_ID}`);
    expect(templateService.saveLatestTestJson).toHaveBeenCalledWith({
      templateId: TEMPLATE_ID,
      fieldDefsJson: [{ name: "firstName" }],
      layoutJson: { grid: 12 },
      rulesJson: ["required:firstName"],
    });
    await app.close();
  });

  it("denies MEMBER with 403", async () => {
    const { app, templateService } = buildTestApp(MEMBER_USER_ID, "MEMBER");
    await app.ready();

    const res = await postForm(app, `/ui-actions/forms/${TEMPLATE_ID}/save-test`, {
      field_defs_json: "[]",
      layout_json: "{}",
      rules_json: "[]",
    });

    expect(res.statusCode).toBe(403);
    expect(templateService.saveLatestTestJson).not.toHaveBeenCalled();
    await app.close();
  });

  it("returns 400 for invalid JSON payload", async () => {
    const { app, templateService } = buildTestApp(MANAGER_USER_ID, "MANAGER");
    await app.ready();

    const res = await postForm(app, `/ui-actions/forms/${TEMPLATE_ID}/save-test`, {
      field_defs_json: "{invalid-json",
      layout_json: "{}",
      rules_json: "[]",
    });

    expect(res.statusCode).toBe(400);
    expect(templateService.saveLatestTestJson).not.toHaveBeenCalled();
    await app.close();
  });
});

describe("POST /ui-actions/forms/:id/publish-test", () => {
  it("allows MANAGER", async () => {
    const { app, templateService } = buildTestApp(MANAGER_USER_ID, "MANAGER");
    await app.ready();

    const res = await post(app, `/ui-actions/forms/${TEMPLATE_ID}/publish-test`);

    expect(res.statusCode).toBe(303);
    expect(res.headers.location).toBe(`/ui/forms/${TEMPLATE_ID}`);
    expect(templateService.publishTest).toHaveBeenCalledWith(TEMPLATE_ID, MANAGER_USER_ID);
    await app.close();
  });

  it("denies MEMBER with 403", async () => {
    const { app, templateService } = buildTestApp(MEMBER_USER_ID, "MEMBER");
    await app.ready();

    const res = await post(app, `/ui-actions/forms/${TEMPLATE_ID}/publish-test`);

    expect(res.statusCode).toBe(403);
    expect(templateService.publishTest).not.toHaveBeenCalled();
    await app.close();
  });
});

describe("POST /ui-actions/forms/:id/publish-prod", () => {
  it("allows MANAGER", async () => {
    const { app, templateService } = buildTestApp(MANAGER_USER_ID, "MANAGER");
    await app.ready();

    const res = await post(app, `/ui-actions/forms/${TEMPLATE_ID}/publish-prod`);

    expect(res.statusCode).toBe(303);
    expect(res.headers.location).toBe(`/ui/forms/${TEMPLATE_ID}`);
    expect(templateService.publishProd).toHaveBeenCalledWith(TEMPLATE_ID, MANAGER_USER_ID);
    await app.close();
  });

  it("denies MEMBER with 403", async () => {
    const { app, templateService } = buildTestApp(MEMBER_USER_ID, "MEMBER");
    await app.ready();

    const res = await post(app, `/ui-actions/forms/${TEMPLATE_ID}/publish-prod`);

    expect(res.statusCode).toBe(403);
    expect(templateService.publishProd).not.toHaveBeenCalled();
    await app.close();
  });
});

describe("POST /ui-actions/forms/:id/delete", () => {
  it("deletes template and redirects to list", async () => {
    const { app, templateService } = buildTestApp(MANAGER_USER_ID, "MANAGER");
    await app.ready();

    const res = await post(app, `/ui-actions/forms/${TEMPLATE_ID}/delete`);

    expect(res.statusCode).toBe(303);
    expect(res.headers.location).toBe("/ui/forms");
    expect(templateService.deleteTemplate).toHaveBeenCalledWith(TEMPLATE_ID);
    await app.close();
  });

  it("redirects back with error when entities exist", async () => {
    const { app, templateService } = buildTestApp(MANAGER_USER_ID, "MANAGER");
    (templateService.deleteTemplate as any).mockImplementationOnce(async () => {
      const err: any = new Error("Template cannot be deleted because entities exist");
      err.statusCode = 409;
      throw err;
    });
    await app.ready();

    const res = await post(app, `/ui-actions/forms/${TEMPLATE_ID}/delete`);

    expect(res.statusCode).toBe(303);
    expect(res.headers.location).toContain(`/ui/forms/${TEMPLATE_ID}?error=`);
    await app.close();
  });
});

describe("POST /ui-actions/forms/:id/reset-starter", () => {
  it("overwrites TEST JSON from starter template deterministically", async () => {
    const { app, templateService } = buildTestApp(MANAGER_USER_ID, "MANAGER");
    (templateService.getTemplateDetail as any).mockResolvedValueOnce({
      template: {
        id: TEMPLATE_ID,
        key: "serial",
        name: "Serial Template",
        templateType: "BATCH_PRODUCTION_ORDER",
        createdAt: new Date(),
      },
      versions: [],
    });
    await app.ready();

    const res = await post(app, `/ui-actions/forms/${TEMPLATE_ID}/reset-starter`);

    expect(res.statusCode).toBe(303);
    expect(res.headers.location).toBe(`/ui/forms/${TEMPLATE_ID}`);
    expect(templateService.saveLatestTestJson).toHaveBeenCalledOnce();
    const payload = (templateService.saveLatestTestJson as any).mock.calls[0][0];
    expect(payload.templateId).toBe(TEMPLATE_ID);
    expect(Array.isArray(payload.fieldDefsJson)).toBe(true);
    expect(payload.fieldDefsJson.length).toBeGreaterThan(0);
    expect(payload.layoutJson).toBeTruthy();
    expect(Array.isArray(payload.layoutJson.sections)).toBe(true);
    await app.close();
  });
});

describe("POST /ui-actions/entities/start", () => {
  it("allows MANAGER", async () => {
    const { app, entityService } = buildTestApp(MANAGER_USER_ID, "MANAGER");
    await app.ready();

    const res = await postForm(app, "/ui-actions/entities/start", { templateId: TEMPLATE_ID, businessKey: "BK-1" });

    expect(res.statusCode).toBe(303);
    expect(res.headers.location).toBe(`/ui/entities/${ENTITY_ID}`);
    expect(entityService.startEntity).toHaveBeenCalledWith({
      groupId: DEFAULT_GROUP_ID,
      templateId: TEMPLATE_ID,
      businessKey: "BK-1",
      currentUserId: MANAGER_USER_ID,
    });
    await app.close();
  });

  it("denies MEMBER with 403", async () => {
    const { app, entityService } = buildTestApp(MEMBER_USER_ID, "MEMBER");
    await app.ready();

    const res = await postForm(app, "/ui-actions/entities/start", { templateId: TEMPLATE_ID });

    expect(res.statusCode).toBe(403);
    expect(entityService.startEntity).not.toHaveBeenCalled();
    await app.close();
  });

  it("returns 409 when no active TEST version exists", async () => {
    const { app, entityService } = buildTestApp(MANAGER_USER_ID, "MANAGER");
    (entityService.startEntity as any).mockImplementationOnce(async () => {
      const err: any = new Error("No active TEST version found for template");
      err.statusCode = 409;
      throw err;
    });
    await app.ready();

    const res = await postForm(app, "/ui-actions/entities/start", { templateId: TEMPLATE_ID });

    expect(res.statusCode).toBe(409);
    await app.close();
  });
});

describe("POST /ui-actions/orders/start", () => {
  it("starts order and redirects to entity detail", async () => {
    const { app, entityService } = buildTestApp(MANAGER_USER_ID, "MANAGER");
    await app.ready();

    const res = await postForm(app, "/ui-actions/orders/start", {
      templateId: TEMPLATE_ID,
      productId: "11111111-1111-1111-1111-111111111111",
      batchId: "22222222-2222-2222-2222-222222222222",
    });

    expect(res.statusCode).toBe(303);
    expect(res.headers.location).toBe(`/ui/entities/${ENTITY_ID}`);
    expect(entityService.startByFormType).toHaveBeenCalledWith({
      groupId: DEFAULT_GROUP_ID,
      templateId: TEMPLATE_ID,
      formType: "BATCH_PRODUCTION_ORDER",
      assignmentId: "11111111-1111-1111-1111-111111111111",
      keyId: "22222222-2222-2222-2222-222222222222",
      currentUserId: MANAGER_USER_ID,
    });
    await app.close();
  });
});

describe("POST /ui-actions/customer-orders/start", () => {
  it("starts customer order with header payload mapping", async () => {
    const { app, entityService } = buildTestApp(MANAGER_USER_ID, "MANAGER");
    await app.ready();

    const res = await postForm(app, "/ui-actions/customer-orders/start", {
      templateId: TEMPLATE_ID,
      customerId: "33333333-3333-3333-3333-333333333333",
      customerOrderId: "44444444-4444-4444-4444-444444444444",
    });

    expect(res.statusCode).toBe(303);
    expect(res.headers.location).toBe(`/ui/entities/${ENTITY_ID}`);
    expect(entityService.startByFormType).toHaveBeenCalledWith({
      groupId: DEFAULT_GROUP_ID,
      templateId: TEMPLATE_ID,
      formType: "CUSTOMER_ORDER",
      assignmentId: "33333333-3333-3333-3333-333333333333",
      keyId: "44444444-4444-4444-4444-444444444444",
      currentUserId: MANAGER_USER_ID,
    });
    await app.close();
  });
});

describe("POST /ui-actions/start", () => {
  it("starts typed form and redirects to entity detail", async () => {
    const { app, entityService } = buildTestApp(MANAGER_USER_ID, "MANAGER");
    await app.ready();

    const res = await postForm(app, "/ui-actions/start", {
      type: "CUSTOMER_ORDER",
      templateId: TEMPLATE_ID,
      assignmentId: "33333333-3333-3333-3333-333333333333",
      keyId: "44444444-4444-4444-4444-444444444444",
    });

    expect(res.statusCode).toBe(303);
    expect(res.headers.location).toBe(`/ui/entities/${ENTITY_ID}`);
    expect(entityService.startByFormType).toHaveBeenCalledWith({
      groupId: DEFAULT_GROUP_ID,
      templateId: TEMPLATE_ID,
      formType: "CUSTOMER_ORDER",
      assignmentId: "33333333-3333-3333-3333-333333333333",
      keyId: "44444444-4444-4444-4444-444444444444",
      currentUserId: MANAGER_USER_ID,
    });
    await app.close();
  });
});

describe("POST /ui-actions/entities/:id/save", () => {
  it("accepts form body and persists via service", async () => {
    const { app, entityService } = buildTestApp(MANAGER_USER_ID, "MANAGER");
    await app.ready();

    const res = await postForm(app, `/ui-actions/entities/${ENTITY_ID}/save`, {
      product_id: "11111111-1111-1111-1111-111111111111",
      batch_id: "BATCH-42",
      temperature: "37.2",
      ok: "on",
      notes: "all good",
    });

    expect(res.statusCode).toBe(303);
    expect(res.headers.location).toBe(`/ui/entities/${ENTITY_ID}`);
    expect(entityService.saveEntityDataFromForm).toHaveBeenCalledWith({
      entityId: ENTITY_ID,
      groupId: DEFAULT_GROUP_ID,
      postedValues: {
        product_id: "11111111-1111-1111-1111-111111111111",
        batch_id: "BATCH-42",
        temperature: "37.2",
        ok: "on",
        notes: "all good",
      },
    });
    await app.close();
  });
});

describe("POST /ui-actions/entities/:id/submit", () => {
  it("allows MANAGER", async () => {
    const { app, entityService } = buildTestApp(MANAGER_USER_ID, "MANAGER");
    await app.ready();

    const res = await post(app, `/ui-actions/entities/${ENTITY_ID}/submit`);

    expect(res.statusCode).toBe(303);
    expect(res.headers.location).toBe(`/ui/entities/${ENTITY_ID}`);
    expect(entityService.submitEntity).toHaveBeenCalledWith({
      entityId: ENTITY_ID,
      groupId: DEFAULT_GROUP_ID,
      currentUserId: MANAGER_USER_ID,
    });
    await app.close();
  });
});

describe("POST /ui-actions/entities/:id/approve", () => {
  it("allows MANAGER", async () => {
    const { app, entityService } = buildTestApp(MANAGER_USER_ID, "MANAGER");
    await app.ready();

    const res = await post(app, `/ui-actions/entities/${ENTITY_ID}/approve`);

    expect(res.statusCode).toBe(303);
    expect(res.headers.location).toBe(`/ui/entities/${ENTITY_ID}`);
    expect(entityService.approveEntity).toHaveBeenCalledWith({
      entityId: ENTITY_ID,
      groupId: DEFAULT_GROUP_ID,
      currentUserId: MANAGER_USER_ID,
    });
    await app.close();
  });

  it("returns 409 for wrong status (approve in DRAFT)", async () => {
    const { app, entityService } = buildTestApp(MANAGER_USER_ID, "MANAGER");
    (entityService.approveEntity as any).mockImplementationOnce(async () => {
      const err: any = new Error("Approve allowed only from SUBMITTED");
      err.statusCode = 409;
      throw err;
    });
    await app.ready();

    const res = await post(app, `/ui-actions/entities/${ENTITY_ID}/approve`);
    expect(res.statusCode).toBe(409);
    await app.close();
  });
});

describe("POST /ui-actions/entities/:id/delete", () => {
  it("deletes draft entity and redirects to /ui/start", async () => {
    const { app, entityService } = buildTestApp(MANAGER_USER_ID, "MANAGER");
    await app.ready();

    const res = await post(app, `/ui-actions/entities/${ENTITY_ID}/delete`);

    expect(res.statusCode).toBe(303);
    expect(res.headers.location).toBe("/ui/start");
    expect(entityService.deleteEntity).toHaveBeenCalledWith({
      entityId: ENTITY_ID,
      groupId: DEFAULT_GROUP_ID,
      currentUserId: MANAGER_USER_ID,
    });
    await app.close();
  });
});
