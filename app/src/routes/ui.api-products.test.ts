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

