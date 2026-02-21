import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";

import { db } from "../db/client.js";
import { formTemplates, formTemplateVersions, groups } from "../db/schema.js";

export type CreateTemplateInput = {
  groupId: string;
  userId: string;
  key: string;
  name: string;
  templateType:
    | "GENERIC"
    | "BATCH_PRODUCTION_ORDER"
    | "SERIAL_PRODUCTION_ORDER"
    | "PRODUCTION_ORDER_BATCH"
    | "PRODUCTION_ORDER_SERIAL"
    | "PRODUCTION_ORDER"
    | "CUSTOMER_ORDER";
  assignmentField?: string;
  keyField?: string;
  description?: string;
  initialFieldDefsJson?: unknown[];
  initialLayoutJson?: Record<string, unknown>;
  initialRulesJson?: unknown[];
};

export type SaveTestJsonInput = {
  templateId: string;
  fieldDefsJson: unknown;
  layoutJson: unknown;
  rulesJson: unknown;
};

export class TemplateRepo {
  async getDefaultGroupId() {
    const rows = await db.select().from(groups).where(eq(groups.name, "default")).limit(1);
    const groupId = rows[0]?.id;
    if (!groupId) {
      const err: any = new Error("Group 'default' not found. Run: npm run seed");
      err.statusCode = 500;
      throw err;
    }
    return groupId;
  }

  async listTemplatesForGroup(groupId: string) {
    return db
      .select()
      .from(formTemplates)
      .where(eq(formTemplates.ownerGroupId, groupId))
      .orderBy(desc(formTemplates.createdAt));
  }

  async createTemplate(input: CreateTemplateInput) {
    const templateId = randomUUID();
    const now = new Date();

    await db.insert(formTemplates).values({
      id: templateId,
      ownerGroupId: input.groupId,
      key: input.key,
      name: input.name,
      templateType: input.templateType,
      assignmentField: input.assignmentField,
      keyField: input.keyField,
      description: input.description,
      isPublicRead: false,
      createdBy: input.userId,
      createdAt: now,
    });

    await db.insert(formTemplateVersions).values({
      id: randomUUID(),
      templateId,
      channel: "TEST",
      isActive: false,
      major: 1,
      minor: 0,
      patch: 0,
      fieldDefsJson: input.initialFieldDefsJson ?? [],
      layoutJson: input.initialLayoutJson ?? { title: `${input.name} Form`, sections: [] },
      rulesJson: input.initialRulesJson ?? [],
      createdAt: now,
    });

    return templateId;
  }

  async getTemplateById(templateId: string) {
    const rows = await db.select().from(formTemplates).where(eq(formTemplates.id, templateId)).limit(1);
    return rows[0];
  }

  async updateTemplateHeaderConfig(templateId: string, assignmentField: string | null, keyField: string | null) {
    await db
      .update(formTemplates)
      .set({
        assignmentField,
        keyField,
      })
      .where(eq(formTemplates.id, templateId));
  }

  async getActiveVersionByChannel(templateId: string, channel: "TEST" | "PROD") {
    const rows = await db
      .select()
      .from(formTemplateVersions)
      .where(and(eq(formTemplateVersions.templateId, templateId), eq(formTemplateVersions.channel, channel), eq(formTemplateVersions.isActive, true)))
      .orderBy(desc(formTemplateVersions.createdAt))
      .limit(1);
    return rows[0];
  }

  async listVersionsForTemplate(templateId: string) {
    return db
      .select()
      .from(formTemplateVersions)
      .where(eq(formTemplateVersions.templateId, templateId))
      .orderBy(desc(formTemplateVersions.createdAt));
  }

  async getLatestVersionByChannel(templateId: string, channel: "TEST" | "PROD") {
    const rows = await db
      .select()
      .from(formTemplateVersions)
      .where(and(eq(formTemplateVersions.templateId, templateId), eq(formTemplateVersions.channel, channel)))
      .orderBy(desc(formTemplateVersions.createdAt))
      .limit(1);
    return rows[0];
  }

  async updateVersionJson(versionId: string, input: Omit<SaveTestJsonInput, "templateId">) {
    await db
      .update(formTemplateVersions)
      .set({
        fieldDefsJson: input.fieldDefsJson,
        layoutJson: input.layoutJson,
        rulesJson: input.rulesJson,
      })
      .where(eq(formTemplateVersions.id, versionId));
  }

  async createTestVersion101(input: SaveTestJsonInput) {
    const now = new Date();
    await db.insert(formTemplateVersions).values({
      id: randomUUID(),
      templateId: input.templateId,
      channel: "TEST",
      isActive: false,
      major: 1,
      minor: 0,
      patch: 1,
      fieldDefsJson: input.fieldDefsJson,
      layoutJson: input.layoutJson,
      rulesJson: input.rulesJson,
      createdAt: now,
    });
  }

  async activateLatestTest(templateId: string, userId: string) {
    const latest = await this.getLatestVersionByChannel(templateId, "TEST");
    if (!latest) {
      const err: any = new Error("No TEST version found");
      err.statusCode = 400;
      throw err;
    }

    const now = new Date();
    await db
      .update(formTemplateVersions)
      .set({ isActive: false })
      .where(and(eq(formTemplateVersions.templateId, templateId), eq(formTemplateVersions.channel, "TEST")));

    await db
      .update(formTemplateVersions)
      .set({ isActive: true, publishedBy: userId, publishedAt: now })
      .where(eq(formTemplateVersions.id, latest.id));
  }

  async publishProdFromLatestTest(templateId: string, userId: string) {
    const latestTest = await this.getLatestVersionByChannel(templateId, "TEST");
    if (!latestTest) {
      const err: any = new Error("No TEST version found");
      err.statusCode = 400;
      throw err;
    }

    await db
      .update(formTemplateVersions)
      .set({ isActive: false })
      .where(and(eq(formTemplateVersions.templateId, templateId), eq(formTemplateVersions.channel, "PROD")));

    await db.insert(formTemplateVersions).values({
      id: randomUUID(),
      templateId,
      channel: "PROD",
      isActive: true,
      major: latestTest.major,
      minor: latestTest.minor,
      patch: latestTest.patch,
      fieldDefsJson: latestTest.fieldDefsJson,
      layoutJson: latestTest.layoutJson,
      rulesJson: latestTest.rulesJson,
      publishedBy: userId,
      publishedAt: new Date(),
      createdAt: new Date(),
    });
  }
}
