import Fastify from "fastify";
import formbody from "@fastify/formbody";
import { describe, expect, it, vi } from "vitest";

import { registerUiRoutes } from "./ui.js";
import type { TemplateService } from "../services/templateService.js";
import type { EntityService } from "../services/entityService.js";
import type { GroupRole } from "../rbac/rbac.js";

describe("legacy UI redirects", () => {
  function buildApp() {
    const templateService = {
      getDefaultGroupId: vi.fn(async () => "44444444-4444-4444-4444-444444444444"),
      listTemplatesForUserDefaultGroup: vi.fn(async () => []),
      createTemplate: vi.fn(async () => "11111111-1111-1111-1111-111111111111"),
      getTemplateDetail: vi.fn(async () => ({ template: null, versions: [] })),
      saveLatestTestJson: vi.fn(async () => undefined),
      publishTest: vi.fn(async () => undefined),
      publishProd: vi.fn(async () => undefined),
      updateTemplateHeaderConfig: vi.fn(async () => undefined),
    } as unknown as TemplateService;

    const entityService = {
      listStartableTemplatesByType: vi.fn(async () => []),
      listEntitiesForFormType: vi.fn(async () => []),
      startByFormType: vi.fn(async () => "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
    } as unknown as EntityService;

    const requireGroupRoleFn = vi.fn(async (_args: { allowed: GroupRole[] }) => "MEMBER" as GroupRole);

    const app = Fastify();
    app.register(formbody);
    app.addHook("preHandler", async (req) => {
      req.currentUser = { id: "22222222-2222-2222-2222-222222222222", email: "member@local" };
    });
    registerUiRoutes(app, { templateService, entityService, requireGroupRoleFn });
    return app;
  }

  it("redirects /ui/entities to /ui/start", async () => {
    const app = buildApp();
    await app.ready();
    const res = await app.inject({ method: "GET", url: "/ui/entities" });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe("/ui/start");
    await app.close();
  });

  it("redirects /ui/orders to /ui/start type", async () => {
    const app = buildApp();
    await app.ready();
    const res = await app.inject({ method: "GET", url: "/ui/orders" });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe("/ui/start?type=PRODUCTION_ORDER_BATCH");
    await app.close();
  });

  it("redirects /ui/customer-orders to /ui/start type", async () => {
    const app = buildApp();
    await app.ready();
    const res = await app.inject({ method: "GET", url: "/ui/customer-orders" });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe("/ui/start?type=CUSTOMER_ORDER");
    await app.close();
  });
});
