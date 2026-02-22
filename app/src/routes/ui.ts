import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { requireGroupRole, type GroupRole } from "../rbac/rbac.js";
import { renderForm, type LookupOptionsProvider } from "../forms/renderer.js";
import { validateTemplateJsonSyntax } from "../forms/syntax.js";
import { ProductsRepo } from "../repos/productsRepo.js";
import { EntityService } from "../services/entityService.js";
import { TemplateService } from "../services/templateService.js";
import {
  FORM_TYPES,
  FORM_TYPE_REGISTRY,
  resolveFormTypeConfig,
  type FormTypeId,
} from "../formTypes/registry.js";
import { getStarterTemplate } from "../formTypes/starterTemplates.js";

const createTemplateBodySchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  templateType: z.enum(FORM_TYPES).default("BATCH_PRODUCTION_ORDER"),
  description: z.string().optional(),
});

const formsNewQuerySchema = z.object({
  templateType: z.preprocess((value) => {
    if (value === undefined || value === null) return undefined;
    const text = String(value).trim();
    if (!text) return undefined;
    if (text === "PRODUCTION_ORDER" || text === "ORDER" || text === "PRODUCTION_ORDER_BATCH") return "BATCH_PRODUCTION_ORDER";
    if (text === "PRODUCTION_ORDER_SERIAL") return "SERIAL_PRODUCTION_ORDER";
    return text;
  }, z.enum(FORM_TYPES).optional()),
});

const formsDetailQuerySchema = z.object({
  error: z.string().optional(),
});

const templateParamsSchema = z.object({
  id: z.string().uuid(),
});

const saveTestBodySchema = z.object({
  field_defs_json: z.string().min(1),
  layout_json: z.string().min(1),
  rules_json: z.string().min(1),
});

const updateHeaderConfigBodySchema = z.object({
  assignment_field: z.string().min(1),
  key_field: z.string().min(1),
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

const startBodySchema = z.object({
  type: z.enum(FORM_TYPES),
  templateId: z.string().uuid(),
  assignmentId: z.string().uuid(),
  keyId: z.string().uuid(),
});

const optionalUuidFromQuery = z.preprocess((value) => {
  if (value === undefined || value === null) return undefined;
  const text = String(value).trim();
  if (!text || text === "null" || text === "Select..." || text === "undefined") return undefined;
  return text;
}, z.string().uuid().optional());

const optionalTypeFromQuery = z.preprocess((value) => {
  if (value === undefined || value === null) return undefined;
  const text = String(value).trim();
  if (!text.length) return undefined;
  if (
    text === "PRODUCTION_ORDER" ||
    text === "PRODUCTION_ORDER_BATCH" ||
    text === "ORDER"
  ) {
    return "BATCH_PRODUCTION_ORDER";
  }
  if (text === "PRODUCTION_ORDER_SERIAL") return "SERIAL_PRODUCTION_ORDER";
  return text;
}, z.enum(FORM_TYPES).optional());

const startPageQuerySchema = z.object({
  type: optionalTypeFromQuery,
  templateId: optionalUuidFromQuery,
  assignmentId: optionalUuidFromQuery,
  keyId: optionalUuidFromQuery,
});

type RequireGroupRoleFn = typeof requireGroupRole;

type UiRouteDeps = {
  templateService?: TemplateService;
  entityService?: EntityService;
  productsRepo?: ProductsRepo;
  lookupOptionsProvider?: LookupOptionsProvider;
  requireGroupRoleFn?: RequireGroupRoleFn;
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

async function loadAssignmentOptions(productsRepo: ProductsRepo, formType: FormTypeId) {
  const config = FORM_TYPE_REGISTRY[formType];
  if (config.assignment.kind === "product") {
    return (await productsRepo.listProducts({ valid: true })).map((p: any) => ({ id: p.id, label: p.name }));
  }
  return (await productsRepo.listCustomers({ valid: true })).map((c: any) => ({ id: c.id, label: c.name }));
}

async function loadKeyOptions(args: {
  productsRepo: ProductsRepo;
  keyField: string;
  assignmentId?: string;
}) {
  if (args.keyField === "batch_id") {
    return (await args.productsRepo.listBatches({ productId: args.assignmentId, valid: true })).map((row: any) => ({
      id: row.id,
      label: row.code,
    }));
  }
  if (args.keyField === "serial_id" || args.keyField === "serial_no" || args.keyField === "serial_number_id") {
    return (await args.productsRepo.listSerialNumbers({ productId: args.assignmentId, valid: true })).map((row: any) => ({
      id: row.id,
      label: row.serial_no ?? row.code ?? row.serialNo,
    }));
  }
  if (args.keyField === "customer_order_id") {
    return (await args.productsRepo.listCustomerOrders({ customerId: args.assignmentId, valid: true })).map((row: any) => ({
      id: row.id,
      label: row.order_no ?? row.orderNo,
    }));
  }
  return [];
}

async function resolveAssignmentFromKey(args: {
  productsRepo: ProductsRepo;
  keyField: string;
  keyId?: string;
}) {
  if (!args.keyId) return undefined;
  if (args.keyField === "batch_id") {
    const row = await args.productsRepo.getBatchById(args.keyId);
    if (!row?.valid) return undefined;
    return row.productId;
  }
  if (args.keyField === "serial_id" || args.keyField === "serial_no" || args.keyField === "serial_number_id") {
    const row = await args.productsRepo.getSerialNumberById(args.keyId);
    if (!row?.valid) return undefined;
    return row.productId;
  }
  if (args.keyField === "customer_order_id") {
    const row = await args.productsRepo.getCustomerOrderById(args.keyId);
    if (!row?.valid) return undefined;
    return row.customerId;
  }
  return undefined;
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

  app.get("/api/batches", async (req) => {
    const querySchema = z.object({
      product_id: z.string().uuid(),
      valid: z.enum(["true", "false"]).optional(),
    });
    const query = parseWithSchema(querySchema, req.query);
    const openOnly = query.valid === "true";
    const rows = await productsRepo.listBatches({
      productId: query.product_id,
      valid: openOnly ? true : undefined,
    });
    return rows.map((row: any) => ({ id: row.id, code: row.code }));
  });

  app.get("/api/serial-numbers", async (req) => {
    const querySchema = z.object({
      product_id: z.string().uuid(),
      valid: z.enum(["true", "false"]).optional(),
    });
    const query = parseWithSchema(querySchema, req.query);
    const rows = await productsRepo.listSerialNumbers({
      productId: query.product_id,
      valid: query.valid === "true" ? true : undefined,
    });
    return rows.map((row: any) => ({ id: row.id, serial_no: row.serial_no ?? row.serialNo }));
  });

  app.get("/api/customers", async (req) => {
    const querySchema = z.object({
      valid: z.enum(["true", "false"]).optional(),
    });
    const query = parseWithSchema(querySchema, req.query);
    if (query.valid === "true") {
      return productsRepo.listCustomers({ valid: true });
    }
    return productsRepo.listCustomers();
  });

  app.get("/api/customer-orders", async (req) => {
    const querySchema = z.object({
      customer_id: z.string().uuid(),
      valid: z.enum(["true", "false"]).optional(),
    });
    const query = parseWithSchema(querySchema, req.query);
    const rows = await productsRepo.listCustomerOrders({
      customerId: query.customer_id,
      valid: query.valid === "true" ? true : undefined,
    });
    return rows.map((row: any) => ({ id: row.id, order_no: row.order_no ?? row.orderNo }));
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
    const query = parseWithSchema(formsNewQuerySchema, req.query);
    const selectedTemplateType = (query.templateType as FormTypeId | undefined) ?? "BATCH_PRODUCTION_ORDER";
    const starter = await getStarterTemplate(selectedTemplateType);
    return reply.view("pages/forms_new", {
      title: "New Template",
      selectedTemplateType,
      initialFieldDefsJson: JSON.stringify(starter.fieldDefsJson, null, 2),
      initialLayoutJson: JSON.stringify(starter.layoutJson, null, 2),
      initialRulesJson: JSON.stringify(starter.rulesJson, null, 2),
    });
  });

  app.get("/ui/forms/:id", async (req, reply) => {
    await requireDefaultGroupMembership({
      userId: req.currentUser!.id,
      allowed: ["ADMIN", "MANAGER", "EDITOR", "MEMBER"],
      templateService,
      requireGroupRoleFn,
    });

    const params = parseWithSchema(templateParamsSchema, req.params);
    const query = parseWithSchema(formsDetailQuerySchema, req.query);
    const detail = await templateService.getTemplateDetail(params.id);
    const starter = await getStarterTemplate(String(detail.template.templateType ?? "BATCH_PRODUCTION_ORDER"), {
      assignmentField: detail.template.assignmentField,
      keyField: detail.template.keyField,
    });
    const latestTest = detail.versions.find((v) => v.channel === "TEST");
    const headerOptionFieldDefs = Array.isArray(latestTest?.fieldDefsJson) && latestTest.fieldDefsJson.length
      ? latestTest.fieldDefsJson
      : starter.fieldDefsJson;
    const headerFieldOptions = (Array.isArray(headerOptionFieldDefs) ? headerOptionFieldDefs : [])
      .filter((f: any) => typeof f?.key === "string")
      .map((f: any) => ({
        key: f.key as string,
        label: typeof f?.label === "string" && f.label ? f.label : (f.key as string),
        headerRole: typeof f?.headerRole === "string" ? f.headerRole : null,
      }));
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
          : starter.fieldDefsJson,
        null,
        2,
      ),
      initialLayoutJson: JSON.stringify(
        latestTest?.layoutJson && typeof latestTest.layoutJson === "object" && Object.keys(latestTest.layoutJson as object).length
          ? latestTest.layoutJson
          : starter.layoutJson,
        null,
        2,
      ),
      initialRulesJson: JSON.stringify(
        latestTest?.rulesJson ?? starter.rulesJson,
        null,
        2,
      ),
      headerFieldOptions,
      previewHtml,
      previewError,
      pageError: query.error,
    });
  });

  app.get("/ui/entities", async (req, reply) => {
    return reply.redirect("/ui/start", 302);
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
      headerInfo: detail.headerInfo,
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
      templateType: body.templateType ?? "BATCH_PRODUCTION_ORDER",
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

  app.post("/ui-actions/forms/:id/header-config", async (req, reply) => {
    await requireDefaultGroupMembership({
      userId: req.currentUser!.id,
      allowed: ["ADMIN", "MANAGER"],
      templateService,
      requireGroupRoleFn,
    });
    const params = parseWithSchema(templateParamsSchema, req.params);
    const body = parseWithSchema(updateHeaderConfigBodySchema, req.body);
    await templateService.updateTemplateHeaderConfig({
      templateId: params.id,
      assignmentField: body.assignment_field,
      keyField: body.key_field,
    });
    return reply.redirect(`/ui/forms/${params.id}`, 303);
  });

  app.post("/ui-actions/forms/:id/reset-starter", async (req, reply) => {
    await requireDefaultGroupMembership({
      userId: req.currentUser!.id,
      allowed: ["ADMIN", "MANAGER"],
      templateService,
      requireGroupRoleFn,
    });
    const params = parseWithSchema(templateParamsSchema, req.params);
    const detail = await templateService.getTemplateDetail(params.id);
    const starter = await getStarterTemplate(detail.template.templateType, {
      assignmentField: detail.template.assignmentField,
      keyField: detail.template.keyField,
    });
    await templateService.saveLatestTestJson({
      templateId: params.id,
      fieldDefsJson: starter.fieldDefsJson,
      layoutJson: starter.layoutJson,
      rulesJson: starter.rulesJson,
    });
    return reply.redirect(`/ui/forms/${params.id}`, 303);
  });

  app.post("/ui-actions/forms/:id/delete", async (req, reply) => {
    await requireDefaultGroupMembership({
      userId: req.currentUser!.id,
      allowed: ["ADMIN", "MANAGER"],
      templateService,
      requireGroupRoleFn,
    });
    const params = parseWithSchema(templateParamsSchema, req.params);
    try {
      await templateService.deleteTemplate(params.id);
    } catch (err: any) {
      if (err?.statusCode === 409) {
        const message = encodeURIComponent(err?.message ?? "Template delete failed");
        return reply.redirect(`/ui/forms/${params.id}?error=${message}`, 303);
      }
      throw err;
    }
    return reply.redirect("/ui/forms", 303);
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

  app.get("/ui/start", async (req, reply) => {
    await requireDefaultGroupMembership({
      userId: req.currentUser!.id,
      allowed: ["ADMIN", "MANAGER", "EDITOR", "MEMBER"],
      templateService,
      requireGroupRoleFn,
    });
    const groupId = await templateService.getDefaultGroupId();
    const query = parseWithSchema(startPageQuerySchema, req.query);
    const selectedType: FormTypeId = (query.type as FormTypeId | undefined) ?? "BATCH_PRODUCTION_ORDER";
    const selectedTemplateId = typeof query.templateId === "string" ? query.templateId : undefined;
    let selectedAssignmentId = typeof query.assignmentId === "string" ? query.assignmentId : undefined;
    let selectedKeyId = typeof query.keyId === "string" ? query.keyId : undefined;
    const startTemplates = await entityService.listStartableTemplatesByType(groupId, selectedType);
    const selectedTemplate = selectedTemplateId ? startTemplates.find((t: any) => t.templateId === selectedTemplateId) : undefined;
    const effectiveConfig = resolveFormTypeConfig({
      templateType: selectedTemplate?.templateType ?? selectedType,
      assignmentField: (selectedTemplate as any)?.assignmentField,
      keyField: (selectedTemplate as any)?.keyField,
    });
    if (selectedKeyId && !selectedAssignmentId) {
      selectedAssignmentId = await resolveAssignmentFromKey({
        productsRepo,
        keyField: effectiveConfig.key.field,
        keyId: selectedKeyId,
      });
    }
    const assignmentOptions = await loadAssignmentOptions(productsRepo, effectiveConfig.id);
    const keyOptions = await loadKeyOptions({
      productsRepo,
      keyField: effectiveConfig.key.field,
      assignmentId: selectedAssignmentId,
    });
    if (selectedKeyId && !keyOptions.some((item) => item.id === selectedKeyId)) {
      selectedKeyId = undefined;
    }
    const items = await entityService.listEntitiesForFormType(groupId, selectedType);

    return reply.view("pages/start_list", {
      title: "Start",
      formTypes: FORM_TYPES.map((id) => ({ id, label: FORM_TYPE_REGISTRY[id].label })),
      selectedType,
      selectedTemplateId,
      selectedAssignmentId,
      selectedKeyId,
      startTemplates,
      assignmentOptions,
      keyOptions,
      effectiveConfig,
      items,
    });
  });

  app.post("/ui-actions/start", async (req, reply) => {
    await requireDefaultGroupMembership({
      userId: req.currentUser!.id,
      allowed: ["ADMIN", "MANAGER"],
      templateService,
      requireGroupRoleFn,
    });
    const body = parseWithSchema(startBodySchema, req.body);
    const groupId = await templateService.getDefaultGroupId();
    const entityId = await entityService.startByFormType({
      groupId,
      templateId: body.templateId,
      formType: body.type,
      assignmentId: body.assignmentId,
      keyId: body.keyId,
      currentUserId: req.currentUser!.id,
    });
    return reply.redirect(`/ui/entities/${entityId}`, 303);
  });

  app.get("/ui/orders", async (req, reply) => {
    return reply.redirect("/ui/start?type=BATCH_PRODUCTION_ORDER", 302);
  });

  app.post("/ui-actions/orders/start", async (req, reply) => {
    await requireDefaultGroupMembership({
      userId: req.currentUser!.id,
      allowed: ["ADMIN", "MANAGER"],
      templateService,
      requireGroupRoleFn,
    });
    const body = parseWithSchema(
      z.object({
        templateId: z.string().uuid(),
        productId: z.string().uuid(),
        batchId: z.string().uuid(),
      }),
      req.body,
    );
    const groupId = await templateService.getDefaultGroupId();
    const entityId = await entityService.startByFormType({
      groupId,
      templateId: body.templateId,
      formType: "BATCH_PRODUCTION_ORDER",
      assignmentId: body.productId,
      keyId: body.batchId,
      currentUserId: req.currentUser!.id,
    });
    return reply.redirect(`/ui/entities/${entityId}`, 303);
  });

  app.get("/ui/customer-orders", async (req, reply) => {
    return reply.redirect("/ui/start?type=CUSTOMER_ORDER", 302);
  });

  app.post("/ui-actions/customer-orders/start", async (req, reply) => {
    await requireDefaultGroupMembership({
      userId: req.currentUser!.id,
      allowed: ["ADMIN", "MANAGER"],
      templateService,
      requireGroupRoleFn,
    });
    const body = parseWithSchema(
      z.object({
        templateId: z.string().uuid(),
        customerId: z.string().uuid().optional(),
        customer_id: z.string().uuid().optional(),
        customerOrderId: z.string().uuid(),
      }),
      req.body,
    );
    const customerId = body.customerId ?? body.customer_id;
    if (!customerId) {
      const err: any = new Error("customerId is required");
      err.statusCode = 400;
      throw err;
    }
    const groupId = await templateService.getDefaultGroupId();
    const entityId = await entityService.startByFormType({
      groupId,
      templateId: body.templateId,
      formType: "CUSTOMER_ORDER",
      assignmentId: customerId,
      keyId: body.customerOrderId,
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

  app.post("/ui-actions/entities/:id/delete", async (req, reply) => {
    await requireDefaultGroupMembership({
      userId: req.currentUser!.id,
      allowed: ["ADMIN", "MANAGER"],
      templateService,
      requireGroupRoleFn,
    });
    const params = parseWithSchema(entityParamsSchema, req.params);
    const groupId = await templateService.getDefaultGroupId();
    await entityService.deleteEntity({
      entityId: params.id,
      groupId,
      currentUserId: req.currentUser!.id,
    });
    return reply.redirect("/ui/start", 303);
  });

}
