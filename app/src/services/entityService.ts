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
    return this.listStartableTemplatesByType(groupId, "BATCH_PRODUCTION_ORDER");
  }

  async listOrderEntitiesForGroup(groupId: string) {
    const items = await this.repo.listEntitiesForGroup(groupId);
    return items.filter((it: any) => {
      const type = normalizeTemplateType(it.templateType);
      return type === "BATCH_PRODUCTION_ORDER" || type === "SERIAL_PRODUCTION_ORDER";
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
      formType: "BATCH_PRODUCTION_ORDER",
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
    const assignmentSnapshotField = config.assignment.kind === "product" ? "product_name" : "customer_name";
    const keySnapshotField = config.key.kind === "batch"
      ? "batch_code"
      : config.key.kind === "serial"
        ? "serial_no"
        : "order_no";

    const dataJson: Record<string, unknown> = {
      _header: {
        assignment: { type: assignmentMeta.type, id: assignmentMeta.id, label: assignmentMeta.label },
        key: { type: keyMeta.type, id: keyMeta.id, label: keyMeta.label },
      },
      [config.assignment.field]: args.assignmentId,
      [config.key.field]: args.keyId,
      [assignmentSnapshotField]: assignmentMeta.label,
      [keySnapshotField]: keyMeta.label,
    };

    return this.repo.insertEntity({
      templateId: args.templateId,
      templateVersionId: activeTestVersion.id,
      ownerGroupId: args.groupId,
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
      (assignmentFieldKey ? ((dataJson[assignmentFieldKey] as string | undefined) ?? undefined) : undefined);
    const keyId =
      keyIdFromHeader ??
      (keyFieldKey ? ((dataJson[keyFieldKey] as string | undefined) ?? undefined) : undefined);

    const assignmentLabelFromHeader =
      (typeof headerAssignment.label === "string" && headerAssignment.label) || null;
    const keyLabelFromHeader = (typeof headerKey.label === "string" && headerKey.label) || null;
    const assignmentSnapshotField = resolvedType.assignment.kind === "product" ? "product_name" : "customer_name";
    const keySnapshotField = resolvedType.key.kind === "batch"
      ? "batch_code"
      : resolvedType.key.kind === "serial"
        ? "serial_no"
        : "order_no";
    const assignmentLabelFromSnapshot = typeof dataJson[assignmentSnapshotField] === "string"
      ? (dataJson[assignmentSnapshotField] as string)
      : null;
    const keyLabelFromSnapshot = typeof dataJson[keySnapshotField] === "string"
      ? (dataJson[keySnapshotField] as string)
      : null;
    const assignmentLabel = assignmentLabelFromSnapshot ?? assignmentLabelFromHeader ?? (await this.getAssignmentLabel(resolvedType.assignment.kind, assignmentId));
    const keyLabel = keyLabelFromSnapshot ?? keyLabelFromHeader ?? (await this.getKeyLabel(resolvedType.key.kind, keyId));

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
      const serial = await this.productsRepo.getSerialNumberById(keyId);
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
      const row = await this.productsRepo.getSerialNumberById(id);
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

    await this.finalizeKeyOnApprove(detail);
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

  async deleteEntity(args: { entityId: string; groupId: string; currentUserId: string }) {
    const detail = await this.getEntityDetail(args.entityId, args.groupId);
    if (detail.entity.status !== "DRAFT") {
      const err: any = new Error("Delete allowed only from DRAFT");
      err.statusCode = 409;
      throw err;
    }

    const deleted = await this.repo.deleteEntity(args.entityId, args.groupId);
    if (!deleted) {
      const err: any = new Error("Entity not found");
      err.statusCode = 404;
      throw err;
    }

    await this.repo.insertAuditLog({
      actorUserId: args.currentUserId,
      eventType: "entity.deleted",
      entityType: "entity",
      entityId: args.entityId,
    });
  }

  async resolveAssignmentIdForKey(args: {
    keyKind: "batch" | "serial" | "customer_order";
    keyId: string;
  }) {
    if (args.keyKind === "batch") {
      const row = await this.productsRepo.getBatchById(args.keyId);
      if (!row || !row.valid) return null;
      return row.productId;
    }
    if (args.keyKind === "serial") {
      const row = await this.productsRepo.getSerialNumberById(args.keyId);
      if (!row || !row.valid) return null;
      return row.productId;
    }
    const row = await this.productsRepo.getCustomerOrderById(args.keyId);
    if (!row || !row.valid) return null;
    return row.customerId;
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

  private async finalizeKeyOnApprove(detail: Awaited<ReturnType<EntityService["getEntityDetail"]>>) {
    const config = resolveFormTypeConfig({
      templateType: detail.template.type,
      assignmentField: detail.template.assignmentField,
      keyField: detail.template.keyField,
    });
    const dataJson = asRecord(detail.entity.dataJson);
    const keyIdValue = dataJson[config.key.field];
    const keyId = typeof keyIdValue === "string" ? keyIdValue : undefined;
    if (!keyId) return;

    if (config.key.kind === "batch") {
      await this.productsRepo.finalizeBatch(keyId);
      return;
    }
    if (config.key.kind === "serial") {
      await this.productsRepo.finalizeSerialNumber(keyId);
      return;
    }
    await this.productsRepo.finalizeCustomerOrder(keyId);
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
