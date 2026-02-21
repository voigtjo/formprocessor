import { EntityRepo } from "../repos/entityRepo.js";
import { ProductsRepo } from "../repos/productsRepo.js";
import type { FieldDef, LayoutJson } from "../forms/syntax.js";
import { validateTemplateJsonSyntax } from "../forms/syntax.js";
import {
  normalizeTemplateType,
  resolveFormTypeConfig,
  type FormTypeId,
} from "../formTypes/registry.js";

function asRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

export class EntityService {
  constructor(
    private readonly repo = new EntityRepo(),
    private readonly productsRepo = new ProductsRepo(),
  ) {}

  async listStartableTemplates(groupId: string) {
    return this.repo.listTemplatesWithActiveTestVersion(groupId);
  }

  async listStartableTemplatesByType(groupId: string, formType: FormTypeId) {
    const templates = await this.repo.listTemplatesWithActiveTestVersion(groupId);
    return templates.filter((t: any) => normalizeTemplateType(t.templateType) === formType);
  }

  async listStartableOrderTemplates(groupId: string) {
    return this.listStartableTemplatesByType(groupId, "PRODUCTION_ORDER_BATCH");
  }

  async listOrderEntitiesForGroup(groupId: string) {
    const items = await this.repo.listEntitiesForGroup(groupId);
    return items.filter((it: any) => {
      const type = normalizeTemplateType(it.templateType);
      return type === "PRODUCTION_ORDER_BATCH" || type === "PRODUCTION_ORDER_SERIAL";
    });
  }

  async listStartableCustomerOrderTemplates(groupId: string) {
    return this.listStartableTemplatesByType(groupId, "CUSTOMER_ORDER");
  }

  async listCustomerOrderEntitiesForGroup(groupId: string) {
    const items = await this.repo.listEntitiesForGroup(groupId);
    return items.filter((it: any) => normalizeTemplateType(it.templateType) === "CUSTOMER_ORDER");
  }

  async listEntitiesForFormType(groupId: string, formType: FormTypeId) {
    const items = await this.repo.listEntitiesForGroup(groupId);
    return items.filter((it: any) => normalizeTemplateType(it.templateType) === formType);
  }

  async startEntity(args: {
    groupId: string;
    templateId: string;
    businessKey?: string;
    currentUserId: string;
  }) {
    const activeTestVersion = await this.repo.getActiveTestVersionForTemplate(args.templateId);
    if (!activeTestVersion) {
      const err: any = new Error("No active TEST version found for template");
      err.statusCode = 409;
      throw err;
    }

    return this.repo.insertEntity({
      templateId: args.templateId,
      templateVersionId: activeTestVersion.id,
      ownerGroupId: args.groupId,
      businessKey: args.businessKey,
      createdBy: args.currentUserId,
    });
  }

  async startOrder(args: {
    groupId: string;
    templateId: string;
    productId: string;
    batchId: string;
    currentUserId: string;
  }) {
    return this.startByFormType({
      groupId: args.groupId,
      templateId: args.templateId,
      formType: "PRODUCTION_ORDER_BATCH",
      assignmentId: args.productId,
      keyId: args.batchId,
      currentUserId: args.currentUserId,
    });
  }

  async startCustomerOrder(args: {
    groupId: string;
    templateId: string;
    customerId: string;
    customerOrderId: string;
    currentUserId: string;
  }) {
    return this.startByFormType({
      groupId: args.groupId,
      templateId: args.templateId,
      formType: "CUSTOMER_ORDER",
      assignmentId: args.customerId,
      keyId: args.customerOrderId,
      currentUserId: args.currentUserId,
    });
  }

  async startByFormType(args: {
    groupId: string;
    templateId: string;
    formType: FormTypeId;
    assignmentId: string;
    keyId: string;
    currentUserId: string;
  }) {
    const template = await this.repo.getTemplateById(args.templateId);
    if (!template) {
      const err: any = new Error("Template not found");
      err.statusCode = 404;
      throw err;
    }

    const config = resolveFormTypeConfig({
      templateType: template.templateType,
      assignmentField: template.assignmentField,
      keyField: template.keyField,
    });

    const activeTestVersion = await this.repo.getActiveTestVersionForTemplate(args.templateId);
    if (!activeTestVersion) {
      const err: any = new Error("No active TEST version found for template");
      err.statusCode = 409;
      throw err;
    }

    const assignmentMeta = await this.resolveAssignmentMeta(config.assignment.kind, args.assignmentId);
    const keyMeta = await this.resolveKeyMeta(config.key.kind, args.keyId, args.assignmentId);

    const dataJson: Record<string, unknown> = {
      _header: {
        assignment: { type: assignmentMeta.type, id: assignmentMeta.id, label: assignmentMeta.label },
        key: { type: keyMeta.type, id: keyMeta.id, label: keyMeta.label },
      },
      [config.assignment.field]: args.assignmentId,
      [config.key.field]: args.keyId,
    };
    if (config.assignment.field === "product_id") {
      dataJson.assignment_product_id = args.assignmentId;
    }

    return this.repo.insertEntity({
      templateId: args.templateId,
      templateVersionId: activeTestVersion.id,
      ownerGroupId: args.groupId,
      businessKey: keyMeta.label,
      createdBy: args.currentUserId,
      dataJson,
    });
  }

  async listEntitiesForGroup(groupId: string) {
    return this.repo.listEntitiesForGroup(groupId);
  }

  async getEntityDetail(entityId: string, groupId: string) {
    const joined = await this.repo.getEntityWithTemplateAndVersion(entityId, groupId);
    if (!joined) {
      const err: any = new Error("Entity not found");
      err.statusCode = 404;
      throw err;
    }

    const entity = joined.entity;
    const templateVersion = await this.repo.getTemplateVersionById(entity.templateVersionId);
    if (!templateVersion) {
      const err: any = new Error("Template version not found");
      err.statusCode = 404;
      throw err;
    }

    const { fieldDefs, layout } = validateTemplateJsonSyntax({
      fieldDefsJson: templateVersion.fieldDefsJson,
      layoutJson: templateVersion.layoutJson,
    });

    const dataJson = asRecord(entity.dataJson);
    const snapshotJson = asRecord(entity.readonlySnapshotJson);
    const header = asRecord(dataJson._header);
    const headerAssignment = asRecord(header.assignment);
    const headerKey = asRecord(header.key);
    const assignmentIdFromHeader = headerAssignment.id ? String(headerAssignment.id) : undefined;
    const keyIdFromHeader = headerKey.id ? String(headerKey.id) : undefined;
    const assignmentFieldKey = joined.assignmentField ?? undefined;
    const keyFieldKey = joined.keyField ?? undefined;
    if (assignmentIdFromHeader && assignmentFieldKey && dataJson[assignmentFieldKey] === undefined) {
      dataJson[assignmentFieldKey] = assignmentIdFromHeader;
    }
    if (keyIdFromHeader && keyFieldKey && dataJson[keyFieldKey] === undefined) {
      dataJson[keyFieldKey] = keyIdFromHeader;
    }
    const values = this.buildRenderValues(fieldDefs, dataJson, snapshotJson);
    const approvals = await this.repo.listApprovalsForEntity(entity.id);
    const resolvedType = resolveFormTypeConfig({
      templateType: joined.templateType,
      assignmentField: joined.assignmentField,
      keyField: joined.keyField,
    });
    const assignmentId =
      assignmentIdFromHeader ??
      (assignmentFieldKey ? ((dataJson[assignmentFieldKey] as string | undefined) ?? undefined) : undefined) ??
      ((dataJson.assignment_product_id as string | undefined) ?? undefined);
    const keyId =
      keyIdFromHeader ??
      (keyFieldKey ? ((dataJson[keyFieldKey] as string | undefined) ?? undefined) : undefined) ??
      ((dataJson.batch_id as string | undefined) ?? undefined);

    const assignmentLabelFromHeader =
      (typeof headerAssignment.label === "string" && headerAssignment.label) || null;
    const keyLabelFromHeader = (typeof headerKey.label === "string" && headerKey.label) || null;
    const assignmentLabel = assignmentLabelFromHeader ?? (await this.getAssignmentLabel(resolvedType.assignment.kind, assignmentId));
    const keyLabel = keyLabelFromHeader ?? (await this.getKeyLabel(resolvedType.key.kind, keyId));

    const hasHeader = Boolean(headerAssignment.id && headerKey.id);
    const effectiveFieldDefs =
      hasHeader && (assignmentFieldKey || keyFieldKey)
        ? fieldDefs.map((f) =>
            f.key === assignmentFieldKey || f.key === keyFieldKey ? { ...f, readonly: true } : f,
          )
        : fieldDefs;

    return {
      entity,
      templateVersion,
      template: {
        name: joined.templateName,
        key: joined.templateKey,
        type: joined.templateType,
        assignmentField: joined.assignmentField,
        keyField: joined.keyField,
      },
      version: {
        channel: joined.versionChannel,
        major: joined.versionMajor,
        minor: joined.versionMinor,
        patch: joined.versionPatch,
      },
      headerInfo: {
        assignmentTitle: `Assignment (${resolvedType.assignment.label})`,
        keyTitle: `Key (${resolvedType.key.label})`,
        assignmentLabel,
        keyLabel,
      },
      fieldDefs: effectiveFieldDefs,
      layout,
      values,
      approvals,
    };
  }

  private async resolveAssignmentMeta(kind: "product" | "customer", assignmentId: string) {
    if (kind === "product") {
      const product = await this.productsRepo.getProductById(assignmentId);
      if (!product || !product.valid) {
        const err: any = new Error("Invalid product selection");
        err.statusCode = 400;
        throw err;
      }
      return { type: "product" as const, id: assignmentId, label: product.name };
    }

    const customer = await this.productsRepo.getCustomerById(assignmentId);
    if (!customer || !customer.valid) {
      const err: any = new Error("Invalid customer selection");
      err.statusCode = 400;
      throw err;
    }
    return { type: "customer" as const, id: assignmentId, label: customer.name };
  }

  private async resolveKeyMeta(kind: "batch" | "serial" | "customer_order", keyId: string, assignmentId: string) {
    if (kind === "batch") {
      const batch = await this.productsRepo.getBatchById(keyId);
      if (!batch || !batch.valid || batch.productId !== assignmentId) {
        const err: any = new Error("Invalid batch selection");
        err.statusCode = 400;
        throw err;
      }
      return { type: "batch" as const, id: keyId, label: batch.code };
    }

    if (kind === "serial") {
      const serial = await this.productsRepo.getSerialById(keyId);
      if (!serial || !serial.valid || serial.productId !== assignmentId) {
        const err: any = new Error("Invalid serial selection");
        err.statusCode = 400;
        throw err;
      }
      return { type: "serial" as const, id: keyId, label: serial.serialNo };
    }

    const customerOrder = await this.productsRepo.getCustomerOrderById(keyId);
    if (!customerOrder || !customerOrder.valid || customerOrder.customerId !== assignmentId) {
      const err: any = new Error("Invalid customer order selection");
      err.statusCode = 400;
      throw err;
    }
    return { type: "customer_order" as const, id: keyId, label: customerOrder.orderNo };
  }

  private async getAssignmentLabel(kind: "product" | "customer", id?: string) {
    if (!id) return null;
    if (kind === "product") {
      const row = await this.productsRepo.getProductById(id);
      return row?.name ?? null;
    }
    const row = await this.productsRepo.getCustomerById(id);
    return row?.name ?? null;
  }

  private async getKeyLabel(kind: "batch" | "serial" | "customer_order", id?: string) {
    if (!id) return null;
    if (kind === "batch") {
      const row = await this.productsRepo.getBatchById(id);
      return row?.code ?? null;
    }
    if (kind === "serial") {
      const row = await this.productsRepo.getSerialById(id);
      return row?.serialNo ?? null;
    }
    const row = await this.productsRepo.getCustomerOrderById(id);
    return row?.orderNo ?? null;
  }

  async saveEntityDataFromForm(args: {
    entityId: string;
    groupId: string;
    postedValues: Record<string, unknown>;
  }) {
    const detail = await this.getEntityDetail(args.entityId, args.groupId);
    if (detail.entity.status !== "DRAFT") {
      const err: any = new Error("Entity is not editable in current status");
      err.statusCode = 409;
      throw err;
    }
    const currentData = asRecord(detail.entity.dataJson);
    const nextData = { ...currentData };

    for (const field of detail.fieldDefs) {
      if (field.semantic !== "WRITABLE_ENTITY") continue;
      if (field.readonly) continue;

      const raw = args.postedValues[field.key];
      const converted = convertPostedValue(field, raw);
      if (field.required && (converted === "" || converted === undefined || converted === null)) {
        const err: any = new Error(`Missing required field: ${field.key}`);
        err.statusCode = 400;
        throw err;
      }
      nextData[field.key] = converted;
    }

    await this.repo.updateEntityDataJson(args.entityId, nextData);
  }

  async submitEntity(args: { entityId: string; groupId: string; currentUserId: string }) {
    const detail = await this.getEntityDetail(args.entityId, args.groupId);
    if (detail.entity.status !== "DRAFT") {
      const err: any = new Error("Submit allowed only from DRAFT");
      err.statusCode = 409;
      throw err;
    }

    await this.repo.updateEntityStatus(args.entityId, "SUBMITTED");
    await this.repo.insertAuditLog({
      actorUserId: args.currentUserId,
      eventType: "entity.submitted",
      entityType: "entity",
      entityId: args.entityId,
    });
  }

  async approveEntity(args: { entityId: string; groupId: string; currentUserId: string }) {
    const detail = await this.getEntityDetail(args.entityId, args.groupId);
    if (detail.entity.status !== "SUBMITTED") {
      const err: any = new Error("Approve allowed only from SUBMITTED");
      err.statusCode = 409;
      throw err;
    }

    await this.repo.updateEntityStatus(args.entityId, "APPROVED_FINAL");
    await this.repo.insertApproval({
      entityId: args.entityId,
      decision: "APPROVE",
      actorUserId: args.currentUserId,
    });
    await this.repo.insertAuditLog({
      actorUserId: args.currentUserId,
      eventType: "entity.approved",
      entityType: "entity",
      entityId: args.entityId,
    });
  }

  async rejectEntity(args: { entityId: string; groupId: string; currentUserId: string }) {
    const detail = await this.getEntityDetail(args.entityId, args.groupId);
    if (detail.entity.status !== "SUBMITTED") {
      const err: any = new Error("Reject allowed only from SUBMITTED");
      err.statusCode = 409;
      throw err;
    }

    await this.repo.updateEntityStatus(args.entityId, "REJECTED");
    await this.repo.insertApproval({
      entityId: args.entityId,
      decision: "REJECT",
      actorUserId: args.currentUserId,
    });
    await this.repo.insertAuditLog({
      actorUserId: args.currentUserId,
      eventType: "entity.rejected",
      entityType: "entity",
      entityId: args.entityId,
    });
  }

  private buildRenderValues(
    fieldDefs: FieldDef[],
    dataJson: Record<string, unknown>,
    snapshotJson: Record<string, unknown>,
  ) {
    const values: Record<string, unknown> = {};
    for (const field of fieldDefs) {
      if (field.semantic === "READONLY_EXTERNAL") {
        if (snapshotJson[field.key] !== undefined && snapshotJson[field.key] !== null) {
          values[field.key] = snapshotJson[field.key];
        }
        continue;
      }
      values[field.key] = dataJson[field.key];
    }
    return values;
  }
}

function convertPostedValue(field: FieldDef, raw: unknown) {
  if (field.type === "boolean") {
    return raw === "on" || raw === "true" || raw === true;
  }

  if (raw === undefined || raw === null || raw === "") {
    return field.type === "number" ? null : "";
  }

  const text = String(raw);
  if (field.type === "number") {
    const n = Number(text);
    if (Number.isNaN(n)) {
      const err: any = new Error(`Invalid number for field: ${field.key}`);
      err.statusCode = 400;
      throw err;
    }
    return n;
  }

  if (field.type === "json") {
    try {
      return JSON.parse(text);
    } catch {
      const err: any = new Error(`Invalid JSON for field: ${field.key}`);
      err.statusCode = 400;
      throw err;
    }
  }

  return text;
}

export type EntityDetail = Awaited<ReturnType<EntityService["getEntityDetail"]>>;
export type ParsedTemplateSyntax = { fieldDefs: FieldDef[]; layout: LayoutJson };
