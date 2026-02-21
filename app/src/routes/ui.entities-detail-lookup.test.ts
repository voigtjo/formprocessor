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
import type { FieldDef, LayoutJson } from "../forms/syntax.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("GET /ui/entities/:id", () => {
  it("renders select with valid options only", async () => {
    const templateService = {
      getDefaultGroupId: vi.fn(async () => "44444444-4444-4444-4444-444444444444"),
      listTemplatesForUserDefaultGroup: vi.fn(async () => []),
      createTemplate: vi.fn(async () => "11111111-1111-1111-1111-111111111111"),
      getTemplateDetail: vi.fn(async () => ({ template: null, versions: [] })),
      saveLatestTestJson: vi.fn(async () => undefined),
      publishTest: vi.fn(async () => undefined),
      publishProd: vi.fn(async () => undefined),
    } as unknown as TemplateService;

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

    const entityService = {
      listEntitiesForGroup: vi.fn(async () => []),
      listStartableTemplates: vi.fn(async () => []),
      getEntityDetail: vi.fn(async () => ({
        entity: {
          id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
          status: "DRAFT",
          businessKey: null,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
        },
        template: { name: "Invoice Template", key: "invoice" },
        version: { channel: "TEST", major: 1, minor: 0, patch: 0 },
        fieldDefs,
        layout,
        values: { product_id: "p1" },
        approvals: [],
      })),
      saveEntityDataFromForm: vi.fn(async () => undefined),
      startEntity: vi.fn(async () => "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
      submitEntity: vi.fn(async () => undefined),
      approveEntity: vi.fn(async () => undefined),
      rejectEntity: vi.fn(async () => undefined),
    } as unknown as EntityService;

    const requireGroupRoleFn = vi.fn(async (args: { allowed: GroupRole[] }) => {
      const role: GroupRole = "MEMBER";
      if (!args.allowed.includes(role)) {
        const err: any = new Error("RBAC denied");
        err.statusCode = 403;
        throw err;
      }
      return role;
    });

    const lookupOptionsProvider = vi.fn(async () => [
      { value: "p1", label: "Alpha Basic" },
      { value: "p2", label: "Beta Plus" },
    ]);

    const app = Fastify();
    app.register(formbody);
    app.register(view, { engine: { ejs }, root: path.join(__dirname, "../views"), viewExt: "ejs" });
    app.addHook("preHandler", async (req) => {
      req.currentUser = { id: "22222222-2222-2222-2222-222222222222", email: "member@local" };
    });
    registerUiRoutes(app, { templateService, entityService, requireGroupRoleFn, lookupOptionsProvider });
    await app.ready();

    const res = await app.inject({ method: "GET", url: "/ui/entities/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('<select name="product_id"');
    expect(res.body).toContain("Alpha Basic");
    expect(res.body).toContain("Beta Plus");
    expect(res.body).not.toContain("Legacy Invalid");

    await app.close();
  });
});

