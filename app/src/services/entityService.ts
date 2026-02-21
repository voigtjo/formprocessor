import { EntityRepo } from "../repos/entityRepo.js";
import type { FieldDef, LayoutJson } from "../forms/syntax.js";
import { validateTemplateJsonSyntax } from "../forms/syntax.js";

function asRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

export class EntityService {
  constructor(private readonly repo = new EntityRepo()) {}

  async listStartableTemplates(groupId: string) {
    return this.repo.listTemplatesWithActiveTestVersion(groupId);
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
    const values = this.buildRenderValues(fieldDefs, dataJson, snapshotJson);
    const approvals = await this.repo.listApprovalsForEntity(entity.id);

    return {
      entity,
      templateVersion,
      template: {
        name: joined.templateName,
        key: joined.templateKey,
      },
      version: {
        channel: joined.versionChannel,
        major: joined.versionMajor,
        minor: joined.versionMinor,
        patch: joined.versionPatch,
      },
      fieldDefs,
      layout,
      values,
      approvals,
    };
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
