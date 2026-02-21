import Fastify from "fastify";
import formbody from "@fastify/formbody";
import { describe, expect, it, vi } from "vitest";

import { registerUiRoutes } from "./ui.js";
import type { TemplateService } from "../services/templateService.js";
import type { EntityService } from "../services/entityService.js";
import type { GroupRole } from "../rbac/rbac.js";
import type { ProductsRepo } from "../repos/productsRepo.js";

describe("GET /api/products", () => {
  it("returns only valid products when valid=true and sorted by name", async () => {
    const templateService = {
      getDefaultGroupId: vi.fn(async () => "44444444-4444-4444-4444-444444444444"),
      listTemplatesForUserDefaultGroup: vi.fn(async () => []),
      createTemplate: vi.fn(async () => "11111111-1111-1111-1111-111111111111"),
      getTemplateDetail: vi.fn(async () => ({ template: null, versions: [] })),
      saveLatestTestJson: vi.fn(async () => undefined),
      publishTest: vi.fn(async () => undefined),
      publishProd: vi.fn(async () => undefined),
    } as unknown as TemplateService;

    const entityService = {
      listEntitiesForGroup: vi.fn(async () => []),
      listStartableTemplates: vi.fn(async () => []),
      getEntityDetail: vi.fn(async () => undefined),
      saveEntityDataFromForm: vi.fn(async () => undefined),
      startEntity: vi.fn(async () => "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
      submitEntity: vi.fn(async () => undefined),
      approveEntity: vi.fn(async () => undefined),
      rejectEntity: vi.fn(async () => undefined),
    } as unknown as EntityService;

    const productsRepo = {
      listProducts: vi.fn(async (_args?: { valid?: boolean }) => [
        { id: "p1", name: "Alpha" },
        { id: "p2", name: "Zulu" },
      ]),
      listBatches: vi.fn(async () => []),
      listCustomers: vi.fn(async () => []),
      listCustomerOrders: vi.fn(async () => []),
    } as unknown as ProductsRepo;

    const requireGroupRoleFn = vi.fn(async (args: { allowed: GroupRole[] }) => {
      const role: GroupRole = "MEMBER";
      if (!args.allowed.includes(role)) {
        const err: any = new Error("RBAC denied");
        err.statusCode = 403;
        throw err;
      }
      return role;
    });

    const app = Fastify();
    app.register(formbody);
    app.addHook("preHandler", async (req) => {
      req.currentUser = { id: "22222222-2222-2222-2222-222222222222", email: "member@local" };
    });
    registerUiRoutes(app, { templateService, entityService, productsRepo, requireGroupRoleFn });
    await app.ready();

    const res = await app.inject({ method: "GET", url: "/api/products?valid=true" });
    expect(res.statusCode).toBe(200);
    expect(productsRepo.listProducts).toHaveBeenCalledWith({ valid: true });
    expect(res.json()).toEqual([
      { id: "p1", name: "Alpha" },
      { id: "p2", name: "Zulu" },
    ]);

    await app.close();
  });
});

describe("GET /api/batches", () => {
  it("returns valid batches only when valid=true and sorted by code", async () => {
    const templateService = {
      getDefaultGroupId: vi.fn(async () => "44444444-4444-4444-4444-444444444444"),
      listTemplatesForUserDefaultGroup: vi.fn(async () => []),
      createTemplate: vi.fn(async () => "11111111-1111-1111-1111-111111111111"),
      getTemplateDetail: vi.fn(async () => ({ template: null, versions: [] })),
      saveLatestTestJson: vi.fn(async () => undefined),
      publishTest: vi.fn(async () => undefined),
      publishProd: vi.fn(async () => undefined),
    } as unknown as TemplateService;

    const entityService = {
      listEntitiesForGroup: vi.fn(async () => []),
      listStartableTemplates: vi.fn(async () => []),
      getEntityDetail: vi.fn(async () => undefined),
      saveEntityDataFromForm: vi.fn(async () => undefined),
      startEntity: vi.fn(async () => "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
      submitEntity: vi.fn(async () => undefined),
      approveEntity: vi.fn(async () => undefined),
      rejectEntity: vi.fn(async () => undefined),
    } as unknown as EntityService;

    const productsRepo = {
      listProducts: vi.fn(async (_args?: { valid?: boolean }) => []),
      listBatches: vi.fn(async (_args: { productId: string; valid?: boolean }) => [
        { id: "b1", code: "ALPHA-001" },
        { id: "b2", code: "ALPHA-002" },
      ]),
      listCustomers: vi.fn(async () => []),
      listCustomerOrders: vi.fn(async () => []),
    } as unknown as ProductsRepo;

    const requireGroupRoleFn = vi.fn(async (args: { allowed: GroupRole[] }) => {
      const role: GroupRole = "MEMBER";
      if (!args.allowed.includes(role)) {
        const err: any = new Error("RBAC denied");
        err.statusCode = 403;
        throw err;
      }
      return role;
    });

    const app = Fastify();
    app.register(formbody);
    app.addHook("preHandler", async (req) => {
      req.currentUser = { id: "22222222-2222-2222-2222-222222222222", email: "member@local" };
    });
    registerUiRoutes(app, { templateService, entityService, productsRepo, requireGroupRoleFn });
    await app.ready();

    const productId = "11111111-1111-1111-1111-111111111111";
    const res = await app.inject({ method: "GET", url: `/api/batches?product_id=${productId}&valid=true` });
    expect(res.statusCode).toBe(200);
    expect(productsRepo.listBatches).toHaveBeenCalledWith({ productId, valid: true });
    expect(res.json()).toEqual([
      { id: "b1", code: "ALPHA-001" },
      { id: "b2", code: "ALPHA-002" },
    ]);

    await app.close();
  });
});

describe("GET /api/serials", () => {
  it("filters by product_id and valid=true and returns sorted serials", async () => {
    const templateService = {
      getDefaultGroupId: vi.fn(async () => "44444444-4444-4444-4444-444444444444"),
      listTemplatesForUserDefaultGroup: vi.fn(async () => []),
      createTemplate: vi.fn(async () => "11111111-1111-1111-1111-111111111111"),
      getTemplateDetail: vi.fn(async () => ({ template: null, versions: [] })),
      saveLatestTestJson: vi.fn(async () => undefined),
      publishTest: vi.fn(async () => undefined),
      publishProd: vi.fn(async () => undefined),
    } as unknown as TemplateService;

    const entityService = {
      listEntitiesForGroup: vi.fn(async () => []),
      listStartableTemplates: vi.fn(async () => []),
      getEntityDetail: vi.fn(async () => undefined),
      saveEntityDataFromForm: vi.fn(async () => undefined),
      startEntity: vi.fn(async () => "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
      submitEntity: vi.fn(async () => undefined),
      approveEntity: vi.fn(async () => undefined),
      rejectEntity: vi.fn(async () => undefined),
    } as unknown as EntityService;

    const productsRepo = {
      listProducts: vi.fn(async () => []),
      listBatches: vi.fn(async () => []),
      listSerials: vi.fn(async (_args: { productId: string; valid?: boolean }) => [
        { id: "s1", code: "SN-A-0001" },
        { id: "s2", code: "SN-A-0002" },
      ]),
      listCustomers: vi.fn(async () => []),
      listCustomerOrders: vi.fn(async () => []),
    } as unknown as ProductsRepo;

    const requireGroupRoleFn = vi.fn(async () => "MEMBER" as GroupRole);

    const app = Fastify();
    app.register(formbody);
    app.addHook("preHandler", async (req) => {
      req.currentUser = { id: "22222222-2222-2222-2222-222222222222", email: "member@local" };
    });
    registerUiRoutes(app, { templateService, entityService, productsRepo, requireGroupRoleFn });
    await app.ready();

    const productId = "11111111-1111-1111-1111-111111111111";
    const res = await app.inject({ method: "GET", url: `/api/serials?product_id=${productId}&valid=true` });
    expect(res.statusCode).toBe(200);
    expect(productsRepo.listSerials).toHaveBeenCalledWith({ productId, valid: true });
    expect(res.json()).toEqual([
      { id: "s1", code: "SN-A-0001" },
      { id: "s2", code: "SN-A-0002" },
    ]);
    await app.close();
  });
});

describe("GET /api/customers", () => {
  it("returns only valid customers sorted by name", async () => {
    const templateService = {
      getDefaultGroupId: vi.fn(async () => "44444444-4444-4444-4444-444444444444"),
      listTemplatesForUserDefaultGroup: vi.fn(async () => []),
      createTemplate: vi.fn(async () => "11111111-1111-1111-1111-111111111111"),
      getTemplateDetail: vi.fn(async () => ({ template: null, versions: [] })),
      saveLatestTestJson: vi.fn(async () => undefined),
      publishTest: vi.fn(async () => undefined),
      publishProd: vi.fn(async () => undefined),
    } as unknown as TemplateService;
    const entityService = {
      listEntitiesForGroup: vi.fn(async () => []),
      listStartableTemplates: vi.fn(async () => []),
      getEntityDetail: vi.fn(async () => undefined),
      saveEntityDataFromForm: vi.fn(async () => undefined),
      startEntity: vi.fn(async () => "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
      startOrder: vi.fn(async () => "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
      startCustomerOrder: vi.fn(async () => "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
      submitEntity: vi.fn(async () => undefined),
      approveEntity: vi.fn(async () => undefined),
      rejectEntity: vi.fn(async () => undefined),
      listOrderEntitiesForGroup: vi.fn(async () => []),
      listStartableOrderTemplates: vi.fn(async () => []),
      listCustomerOrderEntitiesForGroup: vi.fn(async () => []),
      listStartableCustomerOrderTemplates: vi.fn(async () => []),
    } as unknown as EntityService;
    const productsRepo = {
      listProducts: vi.fn(async () => []),
      listBatches: vi.fn(async () => []),
      listCustomers: vi.fn(async () => [
        { id: "c1", name: "Acme Corp" },
        { id: "c2", name: "Bluebird GmbH" },
      ]),
      listCustomerOrders: vi.fn(async () => []),
    } as unknown as ProductsRepo;
    const requireGroupRoleFn = vi.fn(async () => "MEMBER" as GroupRole);

    const app = Fastify();
    app.register(formbody);
    app.addHook("preHandler", async (req) => {
      req.currentUser = { id: "22222222-2222-2222-2222-222222222222", email: "member@local" };
    });
    registerUiRoutes(app, { templateService, entityService, productsRepo, requireGroupRoleFn });
    await app.ready();

    const res = await app.inject({ method: "GET", url: "/api/customers?valid=true" });
    expect(res.statusCode).toBe(200);
    expect(productsRepo.listCustomers).toHaveBeenCalledWith({ valid: true });
    expect(res.json()).toEqual([
      { id: "c1", name: "Acme Corp" },
      { id: "c2", name: "Bluebird GmbH" },
    ]);
    await app.close();
  });
});

describe("GET /api/customer-orders", () => {
  it("filters by customer_id and valid=true", async () => {
    const templateService = {
      getDefaultGroupId: vi.fn(async () => "44444444-4444-4444-4444-444444444444"),
      listTemplatesForUserDefaultGroup: vi.fn(async () => []),
      createTemplate: vi.fn(async () => "11111111-1111-1111-1111-111111111111"),
      getTemplateDetail: vi.fn(async () => ({ template: null, versions: [] })),
      saveLatestTestJson: vi.fn(async () => undefined),
      publishTest: vi.fn(async () => undefined),
      publishProd: vi.fn(async () => undefined),
    } as unknown as TemplateService;
    const entityService = {
      listEntitiesForGroup: vi.fn(async () => []),
      listStartableTemplates: vi.fn(async () => []),
      getEntityDetail: vi.fn(async () => undefined),
      saveEntityDataFromForm: vi.fn(async () => undefined),
      startEntity: vi.fn(async () => "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
      startOrder: vi.fn(async () => "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
      startCustomerOrder: vi.fn(async () => "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
      submitEntity: vi.fn(async () => undefined),
      approveEntity: vi.fn(async () => undefined),
      rejectEntity: vi.fn(async () => undefined),
      listOrderEntitiesForGroup: vi.fn(async () => []),
      listStartableOrderTemplates: vi.fn(async () => []),
      listCustomerOrderEntitiesForGroup: vi.fn(async () => []),
      listStartableCustomerOrderTemplates: vi.fn(async () => []),
    } as unknown as EntityService;
    const productsRepo = {
      listProducts: vi.fn(async () => []),
      listBatches: vi.fn(async () => []),
      listCustomers: vi.fn(async () => []),
      listCustomerOrders: vi.fn(async (_args: { customerId: string; valid?: boolean }) => [
        { id: "o1", order_no: "CO-1001" },
        { id: "o2", order_no: "CO-1002" },
      ]),
    } as unknown as ProductsRepo;
    const requireGroupRoleFn = vi.fn(async () => "MEMBER" as GroupRole);

    const app = Fastify();
    app.register(formbody);
    app.addHook("preHandler", async (req) => {
      req.currentUser = { id: "22222222-2222-2222-2222-222222222222", email: "member@local" };
    });
    registerUiRoutes(app, { templateService, entityService, productsRepo, requireGroupRoleFn });
    await app.ready();

    const customerId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    const res = await app.inject({
      method: "GET",
      url: `/api/customer-orders?customer_id=${customerId}&valid=true`,
    });
    expect(res.statusCode).toBe(200);
    expect(productsRepo.listCustomerOrders).toHaveBeenCalledWith({ customerId, valid: true });
    expect(res.json()).toEqual([
      { id: "o1", order_no: "CO-1001" },
      { id: "o2", order_no: "CO-1002" },
    ]);
    await app.close();
  });
});
