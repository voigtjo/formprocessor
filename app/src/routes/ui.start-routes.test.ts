import Fastify from "fastify";
import formbody from "@fastify/formbody";
import view from "@fastify/view";
import ejs from "ejs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";

import { registerUiRoutes } from "./ui.js";
import type { TemplateService } from "../services/templateService.js";
import type { EntityService } from "../services/entityService.js";
import type { GroupRole } from "../rbac/rbac.js";
import type { ProductsRepo } from "../repos/productsRepo.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_GROUP_ID = "44444444-4444-4444-4444-444444444444";

function buildDeps() {
  const templateService = {
    getDefaultGroupId: vi.fn(async () => DEFAULT_GROUP_ID),
    createTemplate: vi.fn(async () => "11111111-1111-1111-1111-111111111111"),
    saveLatestTestJson: vi.fn(async () => undefined),
    publishTest: vi.fn(async () => undefined),
    publishProd: vi.fn(async () => undefined),
    listTemplatesForUserDefaultGroup: vi.fn(async () => []),
    getTemplateDetail: vi.fn(async () => ({ template: null, versions: [] })),
  } as unknown as TemplateService;

  const entityService = {
    listEntitiesForGroup: vi.fn(async () => []),
    listStartableTemplates: vi.fn(async () => []),
    listStartableTemplatesByType: vi.fn(async () => [
      {
        templateId: "11111111-1111-1111-1111-111111111111",
        key: "customer_order",
        name: "Customer Order",
        templateType: "CUSTOMER_ORDER",
        assignmentField: "customer_id",
        keyField: "customer_order_id",
      },
    ]),
    listEntitiesForFormType: vi.fn(async () => []),
    startByFormType: vi.fn(async () => "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
  } as unknown as EntityService;

  const productsRepo = {
    listProducts: vi.fn(async () => []),
    listBatches: vi.fn(async () => []),
    listSerials: vi.fn(async () => []),
    listCustomers: vi.fn(async () => [
      { id: "cccccccc-cccc-cccc-cccc-cccccccccccc", name: "Acme Corp" },
    ]),
    listCustomerOrders: vi.fn(async () => [
      { id: "dddddddd-dddd-dddd-dddd-dddddddddddd", order_no: "CO-1001" },
    ]),
  } as unknown as ProductsRepo;

  const requireGroupRoleFn = vi.fn(async (args: { allowed: GroupRole[] }) => {
    const role: GroupRole = "MANAGER";
    if (!args.allowed.includes(role)) {
      const err: any = new Error("RBAC denied");
      err.statusCode = 403;
      throw err;
    }
    return role;
  });

  return { templateService, entityService, productsRepo, requireGroupRoleFn };
}

describe("/ui/start", () => {
  it("loads dependent key options when assignment is selected", async () => {
    const deps = buildDeps();
    const app = Fastify();
    app.register(formbody);
    app.register(view, { engine: { ejs }, root: path.join(__dirname, "../views"), viewExt: "ejs" });
    app.addHook("preHandler", async (req) => {
      req.currentUser = { id: "22222222-2222-2222-2222-222222222222", email: "manager@local" };
    });
    registerUiRoutes(app, deps);
    await app.ready();

    const res = await app.inject({
      method: "GET",
      url: "/ui/start?type=CUSTOMER_ORDER&templateId=11111111-1111-1111-1111-111111111111&assignmentId=cccccccc-cccc-cccc-cccc-cccccccccccc",
    });

    expect(res.statusCode).toBe(200);
    expect(deps.productsRepo.listCustomerOrders).toHaveBeenCalledWith({
      customerId: "cccccccc-cccc-cccc-cccc-cccccccccccc",
      valid: true,
    });
    expect(res.body).toContain('name="keyId"');
    expect(res.body).toContain('CO-1001');

    await app.close();
  });

  it("start action creates entity through typed start handler", async () => {
    const deps = buildDeps();
    const app = Fastify();
    app.register(formbody);
    app.addHook("preHandler", async (req) => {
      req.currentUser = { id: "22222222-2222-2222-2222-222222222222", email: "manager@local" };
    });
    registerUiRoutes(app, deps);
    await app.ready();

    const res = await app.inject({
      method: "POST",
      url: "/ui-actions/start",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      payload:
        "type=CUSTOMER_ORDER&templateId=11111111-1111-1111-1111-111111111111&assignmentId=cccccccc-cccc-cccc-cccc-cccccccccccc&keyId=dddddddd-dddd-dddd-dddd-dddddddddddd",
    });

    expect(res.statusCode).toBe(303);
    expect(res.headers.location).toBe("/ui/entities/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    expect(deps.entityService.startByFormType).toHaveBeenCalledWith({
      groupId: DEFAULT_GROUP_ID,
      templateId: "11111111-1111-1111-1111-111111111111",
      formType: "CUSTOMER_ORDER",
      assignmentId: "cccccccc-cccc-cccc-cccc-cccccccccccc",
      keyId: "dddddddd-dddd-dddd-dddd-dddddddddddd",
      currentUserId: "22222222-2222-2222-2222-222222222222",
    });

    await app.close();
  });

  it("accepts empty templateId/assignmentId/keyId query values without invalid uuid error", async () => {
    const deps = buildDeps();
    const app = Fastify();
    app.register(formbody);
    app.register(view, { engine: { ejs }, root: path.join(__dirname, "../views"), viewExt: "ejs" });
    app.addHook("preHandler", async (req) => {
      req.currentUser = { id: "22222222-2222-2222-2222-222222222222", email: "manager@local" };
    });
    registerUiRoutes(app, deps);
    await app.ready();

    const res = await app.inject({
      method: "GET",
      url: "/ui/start?type=CUSTOMER_ORDER&templateId=&assignmentId=&keyId=",
    });

    expect(res.statusCode).toBe(200);
    await app.close();
  });
});
