import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { requireGroupRole, type GroupRole } from "../rbac/rbac.js";
import { renderForm, type LookupOptionsProvider } from "../forms/renderer.js";
import { validateTemplateJsonSyntax } from "../forms/syntax.js";
import { ProductsRepo } from "../repos/productsRepo.js";
import { EntityService } from "../services/entityService.js";
import { TemplateService } from "../services/templateService.js";

const createTemplateBodySchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
});

const templateParamsSchema = z.object({
  id: z.string().uuid(),
});

const saveTestBodySchema = z.object({
  field_defs_json: z.string().min(1),
  layout_json: z.string().min(1),
  rules_json: z.string().min(1),
});

const entityParamsSchema = z.object({
  id: z.string().uuid(),
});

const startEntityBodySchema = z.object({
  templateId: z.string().uuid(),
  businessKey: z
    .string()
    .optional()
    .transform((v) => {
      if (!v) return undefined;
      const trimmed = v.trim();
      return trimmed.length ? trimmed : undefined;
    }),
});

type RequireGroupRoleFn = typeof requireGroupRole;

type UiRouteDeps = {
  templateService?: TemplateService;
  entityService?: EntityService;
  productsRepo?: ProductsRepo;
  lookupOptionsProvider?: LookupOptionsProvider;
  requireGroupRoleFn?: RequireGroupRoleFn;
};

const demoFieldDefs = [
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

const demoLayout = {
  title: "Demo Product Form",
  sections: [
    {
      title: "Main",
      rows: [{ cols: [{ field: "product_id" }] }],
    },
  ],
};

function parseJsonFromText(value: string, fieldName: string) {
  try {
    return JSON.parse(value);
  } catch {
    const err: any = new Error(`Invalid JSON in ${fieldName}`);
    err.statusCode = 400;
    throw err;
  }
}

function parseWithSchema<T>(schema: z.ZodSchema<T>, value: unknown) {
  const result = schema.safeParse(value);
  if (!result.success) {
    const err: any = new Error(result.error.issues[0]?.message ?? "Validation failed");
    err.statusCode = 400;
    throw err;
  }
  return result.data;
}

async function requireDefaultGroupMembership(args: {
  userId: string;
  allowed: GroupRole[];
  templateService: TemplateService;
  requireGroupRoleFn: RequireGroupRoleFn;
}) {
  const groupId = await args.templateService.getDefaultGroupId();
  return args.requireGroupRoleFn({
    userId: args.userId,
    groupId,
    allowed: args.allowed,
  });
}

export function registerUiRoutes(app: FastifyInstance, deps: UiRouteDeps = {}) {
  const templateService = deps.templateService ?? new TemplateService();
  const entityService = deps.entityService ?? new EntityService();
  const productsRepo = deps.productsRepo ?? new ProductsRepo();
  const lookupOptionsProvider = deps.lookupOptionsProvider;
  const requireGroupRoleFn = deps.requireGroupRoleFn ?? requireGroupRole;

  app.get("/ui", async (_req, reply) => reply.view("pages/dashboard", { title: "Dashboard" }));

  app.get("/api/products", async (req) => {
    const querySchema = z.object({
      valid: z.enum(["true", "false"]).optional(),
    });
    const query = parseWithSchema(querySchema, req.query);
    if (query.valid === "true") {
      return productsRepo.listProducts({ valid: true });
    }
    return productsRepo.listProducts();
  });

  app.get("/ui/forms", async (req, reply) => {
    await requireDefaultGroupMembership({
      userId: req.currentUser!.id,
      allowed: ["ADMIN", "MANAGER", "EDITOR", "MEMBER"],
      templateService,
      requireGroupRoleFn,
    });
    const items = await templateService.listTemplatesForUserDefaultGroup();
    return reply.view("pages/forms_list", { title: "Templates", items });
  });

  app.get("/ui/forms/new", async (req, reply) => {
    await requireDefaultGroupMembership({
      userId: req.currentUser!.id,
      allowed: ["ADMIN", "MANAGER", "EDITOR", "MEMBER"],
      templateService,
      requireGroupRoleFn,
    });
    return reply.view("pages/forms_new", { title: "New Template" });
  });

  app.get("/ui/forms/:id", async (req, reply) => {
    await requireDefaultGroupMembership({
      userId: req.currentUser!.id,
      allowed: ["ADMIN", "MANAGER", "EDITOR", "MEMBER"],
      templateService,
      requireGroupRoleFn,
    });

    const params = parseWithSchema(templateParamsSchema, req.params);
    const detail = await templateService.getTemplateDetail(params.id);
    const latestTest = detail.versions.find((v) => v.channel === "TEST");
    let previewHtml = "";
    let previewError: string | null = null;

    if (latestTest) {
      try {
        const syntax = validateTemplateJsonSyntax({
          fieldDefsJson: latestTest.fieldDefsJson,
          layoutJson: latestTest.layoutJson,
        });
        previewHtml = await renderForm(syntax.layout, syntax.fieldDefs, {}, true, lookupOptionsProvider);
      } catch (err: any) {
        previewError = err?.message ?? "Preview could not be rendered";
      }
    }

    return reply.view("pages/forms_detail", {
      title: `Template ${detail.template.name}`,
      template: detail.template,
      versions: detail.versions,
      latestTest,
      initialFieldDefsJson: JSON.stringify(
        Array.isArray(latestTest?.fieldDefsJson) && latestTest.fieldDefsJson.length
          ? latestTest.fieldDefsJson
          : demoFieldDefs,
        null,
        2,
      ),
      initialLayoutJson: JSON.stringify(
        latestTest?.layoutJson && typeof latestTest.layoutJson === "object" && Object.keys(latestTest.layoutJson as object).length
          ? latestTest.layoutJson
          : demoLayout,
        null,
        2,
      ),
      initialRulesJson: JSON.stringify(latestTest?.rulesJson ?? [], null, 2),
      previewHtml,
      previewError,
    });
  });

  app.get("/ui/entities", async (req, reply) => {
    await requireDefaultGroupMembership({
      userId: req.currentUser!.id,
      allowed: ["ADMIN", "MANAGER", "EDITOR", "MEMBER"],
      templateService,
      requireGroupRoleFn,
    });

    const defaultGroupId = await templateService.getDefaultGroupId();
    const items = await entityService.listEntitiesForGroup(defaultGroupId);
    const startTemplates = await entityService.listStartableTemplates(defaultGroupId);
    return reply.view("pages/entities_list", { title: "Entities", items, startTemplates });
  });

  app.get("/ui/entities/:id", async (req, reply) => {
    await requireDefaultGroupMembership({
      userId: req.currentUser!.id,
      allowed: ["ADMIN", "MANAGER", "EDITOR", "MEMBER"],
      templateService,
      requireGroupRoleFn,
    });
    const params = parseWithSchema(entityParamsSchema, req.params);
    const groupId = await templateService.getDefaultGroupId();
    const detail = await entityService.getEntityDetail(params.id, groupId);
    const readonlyMode = detail.entity.status !== "DRAFT";
    const formHtml = await renderForm(detail.layout, detail.fieldDefs, detail.values, readonlyMode, lookupOptionsProvider);

    return reply.view("pages/entities_detail", {
      title: `Entity ${detail.entity.id}`,
      entity: detail.entity,
      template: detail.template,
      version: detail.version,
      approvals: detail.approvals,
      readonlyMode,
      formHtml,
    });
  });

  app.post("/ui-actions/forms", async (req, reply) => {
    await requireDefaultGroupMembership({
      userId: req.currentUser!.id,
      allowed: ["ADMIN", "MANAGER"],
      templateService,
      requireGroupRoleFn,
    });

    const body = parseWithSchema(createTemplateBodySchema, req.body);
    const templateId = await templateService.createTemplate({
      key: body.key,
      name: body.name,
      description: body.description,
      currentUserId: req.currentUser!.id,
    });

    return reply.redirect(`/ui/forms/${templateId}`, 303);
  });

  app.post("/ui-actions/forms/:id/save-test", async (req, reply) => {
    await requireDefaultGroupMembership({
      userId: req.currentUser!.id,
      allowed: ["ADMIN", "MANAGER"],
      templateService,
      requireGroupRoleFn,
    });

    const params = parseWithSchema(templateParamsSchema, req.params);
    const body = parseWithSchema(saveTestBodySchema, req.body);

    await templateService.saveLatestTestJson({
      templateId: params.id,
      fieldDefsJson: parseJsonFromText(body.field_defs_json, "field_defs_json"),
      layoutJson: parseJsonFromText(body.layout_json, "layout_json"),
      rulesJson: parseJsonFromText(body.rules_json, "rules_json"),
    });

    return reply.redirect(`/ui/forms/${params.id}`, 303);
  });

  app.post("/ui-actions/forms/:id/publish-test", async (req, reply) => {
    await requireDefaultGroupMembership({
      userId: req.currentUser!.id,
      allowed: ["MANAGER"],
      templateService,
      requireGroupRoleFn,
    });

    const params = parseWithSchema(templateParamsSchema, req.params);
    await templateService.publishTest(params.id, req.currentUser!.id);
    return reply.redirect(`/ui/forms/${params.id}`, 303);
  });

  app.post("/ui-actions/forms/:id/publish-prod", async (req, reply) => {
    await requireDefaultGroupMembership({
      userId: req.currentUser!.id,
      allowed: ["MANAGER"],
      templateService,
      requireGroupRoleFn,
    });

    const params = parseWithSchema(templateParamsSchema, req.params);
    await templateService.publishProd(params.id, req.currentUser!.id);
    return reply.redirect(`/ui/forms/${params.id}`, 303);
  });

  app.post("/ui-actions/entities/:id/save", async (req, reply) => {
    await requireDefaultGroupMembership({
      userId: req.currentUser!.id,
      allowed: ["ADMIN", "MANAGER"],
      templateService,
      requireGroupRoleFn,
    });
    const params = parseWithSchema(entityParamsSchema, req.params);
    const groupId = await templateService.getDefaultGroupId();
    const postedValues = (req.body ?? {}) as Record<string, unknown>;
    await entityService.saveEntityDataFromForm({
      entityId: params.id,
      groupId,
      postedValues,
    });
    return reply.redirect(`/ui/entities/${params.id}`, 303);
  });

  app.post("/ui-actions/entities/start", async (req, reply) => {
    await requireDefaultGroupMembership({
      userId: req.currentUser!.id,
      allowed: ["ADMIN", "MANAGER"],
      templateService,
      requireGroupRoleFn,
    });
    const body = parseWithSchema(startEntityBodySchema, req.body);
    const groupId = await templateService.getDefaultGroupId();
    const entityId = await entityService.startEntity({
      groupId,
      templateId: body.templateId,
      businessKey: body.businessKey,
      currentUserId: req.currentUser!.id,
    });
    return reply.redirect(`/ui/entities/${entityId}`, 303);
  });

  app.post("/ui-actions/entities/:id/submit", async (req, reply) => {
    await requireDefaultGroupMembership({
      userId: req.currentUser!.id,
      allowed: ["ADMIN", "MANAGER"],
      templateService,
      requireGroupRoleFn,
    });
    const params = parseWithSchema(entityParamsSchema, req.params);
    const groupId = await templateService.getDefaultGroupId();
    await entityService.submitEntity({
      entityId: params.id,
      groupId,
      currentUserId: req.currentUser!.id,
    });
    return reply.redirect(`/ui/entities/${params.id}`, 303);
  });

  app.post("/ui-actions/entities/:id/approve", async (req, reply) => {
    await requireDefaultGroupMembership({
      userId: req.currentUser!.id,
      allowed: ["ADMIN", "MANAGER"],
      templateService,
      requireGroupRoleFn,
    });
    const params = parseWithSchema(entityParamsSchema, req.params);
    const groupId = await templateService.getDefaultGroupId();
    await entityService.approveEntity({
      entityId: params.id,
      groupId,
      currentUserId: req.currentUser!.id,
    });
    return reply.redirect(`/ui/entities/${params.id}`, 303);
  });

  app.post("/ui-actions/entities/:id/reject", async (req, reply) => {
    await requireDefaultGroupMembership({
      userId: req.currentUser!.id,
      allowed: ["ADMIN", "MANAGER"],
      templateService,
      requireGroupRoleFn,
    });
    const params = parseWithSchema(entityParamsSchema, req.params);
    const groupId = await templateService.getDefaultGroupId();
    await entityService.rejectEntity({
      entityId: params.id,
      groupId,
      currentUserId: req.currentUser!.id,
    });
    return reply.redirect(`/ui/entities/${params.id}`, 303);
  });
}
