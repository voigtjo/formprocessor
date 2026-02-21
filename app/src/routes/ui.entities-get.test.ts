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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("GET /ui/entities", () => {
  it("renders template name when an entity exists", async () => {
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
      listEntitiesForGroup: vi.fn(async () => [
        {
          id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
          templateId: "11111111-1111-1111-1111-111111111111",
          templateVersionId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
          status: "DRAFT",
          businessKey: "BK-1",
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          templateName: "Invoice Template",
          templateKey: "invoice",
          versionChannel: "TEST",
          versionMajor: 1,
          versionMinor: 0,
          versionPatch: 0,
        },
      ]),
      listStartableTemplates: vi.fn(async () => []),
      getEntityDetail: vi.fn(async () => undefined),
      saveEntityDataFromForm: vi.fn(async () => undefined),
      startEntity: vi.fn(async () => "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
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

    const app = Fastify();
    app.register(formbody);
    app.register(view, { engine: { ejs }, root: path.join(__dirname, "../views"), viewExt: "ejs" });
    app.addHook("preHandler", async (req) => {
      req.currentUser = { id: "22222222-2222-2222-2222-222222222222", email: "member@local" };
    });
    registerUiRoutes(app, { templateService, entityService, requireGroupRoleFn });
    await app.ready();

    const res = await app.inject({ method: "GET", url: "/ui/entities" });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain("Invoice Template");

    await app.close();
  });
});

