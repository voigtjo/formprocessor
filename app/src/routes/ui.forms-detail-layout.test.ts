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

describe("GET /ui/forms/:id", () => {
  it("does not render 'Invalid layout_json: Required' for empty-object layout_json", async () => {
    const templateService = {
      getDefaultGroupId: vi.fn(async () => "44444444-4444-4444-4444-444444444444"),
      listTemplatesForUserDefaultGroup: vi.fn(async () => []),
      createTemplate: vi.fn(async () => "11111111-1111-1111-1111-111111111111"),
      saveLatestTestJson: vi.fn(async () => undefined),
      publishTest: vi.fn(async () => undefined),
      publishProd: vi.fn(async () => undefined),
      updateTemplateHeaderConfig: vi.fn(async () => undefined),
      getTemplateDetail: vi.fn(async () => ({
        template: {
          id: "11111111-1111-1111-1111-111111111111",
          key: "serial",
          name: "Serial Template",
          templateType: "SERIAL_PRODUCTION_ORDER",
          assignmentField: "product_id",
          keyField: "serial_number_id",
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
        },
        versions: [
          {
            id: "22222222-2222-2222-2222-222222222222",
            templateId: "11111111-1111-1111-1111-111111111111",
            channel: "TEST",
            isActive: false,
            major: 1,
            minor: 0,
            patch: 0,
            fieldDefsJson: [],
            layoutJson: {},
            rulesJson: [],
            createdAt: new Date("2026-01-01T00:00:00.000Z"),
          },
        ],
      })),
    } as unknown as TemplateService;

    const entityService = {
      listEntitiesForGroup: vi.fn(async () => []),
      listStartableTemplates: vi.fn(async () => []),
    } as unknown as EntityService;

    const requireGroupRoleFn = vi.fn(async (_args: { allowed: GroupRole[] }) => "MEMBER" as GroupRole);

    const app = Fastify();
    app.register(formbody);
    app.register(view, { engine: { ejs }, root: path.join(__dirname, "../views"), viewExt: "ejs" });
    app.addHook("preHandler", async (req) => {
      req.currentUser = { id: "22222222-2222-2222-2222-222222222222", email: "member@local" };
    });
    registerUiRoutes(app, { templateService, entityService, requireGroupRoleFn });
    await app.ready();

    const res = await app.inject({ method: "GET", url: "/ui/forms/11111111-1111-1111-1111-111111111111" });
    expect(res.statusCode).toBe(200);
    expect(res.body).not.toContain("Invalid layout_json: Required");

    await app.close();
  });
});
