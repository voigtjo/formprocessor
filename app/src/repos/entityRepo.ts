import { and, desc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { db } from "../db/client.js";
import { approvals, auditLog, entities, formTemplates, formTemplateVersions } from "../db/schema.js";

export class EntityRepo {
  async listTemplatesWithActiveTestVersion(groupId: string) {
    const rows = await db
      .select({
        templateId: formTemplates.id,
        key: formTemplates.key,
        name: formTemplates.name,
        versionId: formTemplateVersions.id,
      })
      .from(formTemplates)
      .innerJoin(
        formTemplateVersions,
        and(
          eq(formTemplateVersions.templateId, formTemplates.id),
          eq(formTemplateVersions.channel, "TEST"),
          eq(formTemplateVersions.isActive, true),
        ),
      )
      .where(eq(formTemplates.ownerGroupId, groupId))
      .orderBy(desc(formTemplates.createdAt));

    return rows;
  }

  async getActiveTestVersionForTemplate(templateId: string) {
    const rows = await db
      .select()
      .from(formTemplateVersions)
      .where(
        and(
          eq(formTemplateVersions.templateId, templateId),
          eq(formTemplateVersions.channel, "TEST"),
          eq(formTemplateVersions.isActive, true),
        ),
      )
      .limit(1);
    return rows[0];
  }

  async insertEntity(args: {
    templateId: string;
    templateVersionId: string;
    ownerGroupId: string;
    businessKey?: string;
    createdBy: string;
  }) {
    const id = randomUUID();
    const now = new Date();
    await db.insert(entities).values({
      id,
      templateId: args.templateId,
      templateVersionId: args.templateVersionId,
      ownerGroupId: args.ownerGroupId,
      businessKey: args.businessKey,
      status: "DRAFT",
      dataJson: {},
      readonlySnapshotJson: {},
      createdBy: args.createdBy,
      createdAt: now,
      updatedAt: now,
    });

    await db.insert(auditLog).values({
      id: randomUUID(),
      actorUserId: args.createdBy,
      eventType: "entity.created",
      entityType: "entity",
      entityId: id,
      payloadJson: {
        templateId: args.templateId,
        templateVersionId: args.templateVersionId,
        businessKey: args.businessKey ?? null,
      },
      createdAt: now,
    });

    return id;
  }

  async listEntitiesForGroup(groupId: string) {
    return db
      .select({
        id: entities.id,
        templateId: entities.templateId,
        templateVersionId: entities.templateVersionId,
        status: entities.status,
        businessKey: entities.businessKey,
        createdAt: entities.createdAt,
        templateName: formTemplates.name,
        templateKey: formTemplates.key,
        versionChannel: formTemplateVersions.channel,
        versionMajor: formTemplateVersions.major,
        versionMinor: formTemplateVersions.minor,
        versionPatch: formTemplateVersions.patch,
      })
      .from(entities)
      .innerJoin(formTemplates, eq(formTemplates.id, entities.templateId))
      .innerJoin(formTemplateVersions, eq(formTemplateVersions.id, entities.templateVersionId))
      .where(eq(entities.ownerGroupId, groupId))
      .orderBy(desc(entities.createdAt));
  }

  async getEntityById(entityId: string) {
    const rows = await db.select().from(entities).where(eq(entities.id, entityId)).limit(1);
    return rows[0];
  }

  async getTemplateVersionById(templateVersionId: string) {
    const rows = await db
      .select()
      .from(formTemplateVersions)
      .where(eq(formTemplateVersions.id, templateVersionId))
      .limit(1);
    return rows[0];
  }

  async getEntityWithTemplateAndVersion(entityId: string, groupId: string) {
    const rows = await db
      .select({
        entity: entities,
        templateName: formTemplates.name,
        templateKey: formTemplates.key,
        versionChannel: formTemplateVersions.channel,
        versionMajor: formTemplateVersions.major,
        versionMinor: formTemplateVersions.minor,
        versionPatch: formTemplateVersions.patch,
      })
      .from(entities)
      .innerJoin(formTemplates, eq(formTemplates.id, entities.templateId))
      .innerJoin(formTemplateVersions, eq(formTemplateVersions.id, entities.templateVersionId))
      .where(and(eq(entities.id, entityId), eq(entities.ownerGroupId, groupId)))
      .limit(1);
    return rows[0];
  }

  async updateEntityDataJson(entityId: string, dataJson: Record<string, unknown>) {
    await db
      .update(entities)
      .set({
        dataJson,
        updatedAt: new Date(),
      })
      .where(eq(entities.id, entityId));
  }

  async updateEntityStatus(entityId: string, status: "DRAFT" | "SUBMITTED" | "APPROVED_FINAL" | "REJECTED") {
    await db
      .update(entities)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(entities.id, entityId));
  }

  async insertApproval(args: {
    entityId: string;
    decision: "APPROVE" | "REJECT";
    actorUserId: string;
    comment?: string;
  }) {
    await db.insert(approvals).values({
      id: randomUUID(),
      entityId: args.entityId,
      decision: args.decision,
      actorUserId: args.actorUserId,
      comment: args.comment,
      createdAt: new Date(),
    });
  }

  async listApprovalsForEntity(entityId: string) {
    return db.select().from(approvals).where(eq(approvals.entityId, entityId)).orderBy(desc(approvals.createdAt));
  }

  async insertAuditLog(args: {
    actorUserId: string;
    eventType: string;
    entityType: string;
    entityId: string;
    payloadJson?: Record<string, unknown>;
  }) {
    await db.insert(auditLog).values({
      id: randomUUID(),
      actorUserId: args.actorUserId,
      eventType: args.eventType,
      entityType: args.entityType,
      entityId: args.entityId,
      payloadJson: args.payloadJson ?? null,
      createdAt: new Date(),
    });
  }

  async ensureEntityOwnedByGroup(entityId: string, groupId: string) {
    const rows = await db
      .select()
      .from(entities)
      .where(and(eq(entities.id, entityId), eq(entities.ownerGroupId, groupId)))
      .limit(1);
    return rows[0];
  }
}
