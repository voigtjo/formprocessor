import { pgTable, uuid, text, boolean, timestamp, jsonb, integer, pgEnum } from "drizzle-orm/pg-core";

export const userRoleGlobal = pgEnum("user_role_global", ["GLOBAL", "USER"]);
export const groupRole = pgEnum("group_role", ["ADMIN", "MANAGER", "EDITOR", "MEMBER"]);
export const releaseChannel = pgEnum("release_channel", ["TEST", "PROD"]);
export const docStatus = pgEnum("doc_status", ["DRAFT", "SUBMITTED", "APPROVED_FINAL", "REJECTED"]);
export const approvalDecision = pgEnum("approval_decision", ["APPROVE", "REJECT"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull(),
  displayName: text("display_name"),
  isActive: boolean("is_active").notNull(),
  globalRole: userRoleGlobal("global_role").notNull(),
  authIdentity: jsonb("auth_identity"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});

export const groups = pgTable("groups", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});

export const groupMemberships = pgTable("group_memberships", {
  groupId: uuid("group_id").notNull(),
  userId: uuid("user_id").notNull(),
  role: groupRole("role").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});

export const formTemplates = pgTable("form_templates", {
  id: uuid("id").primaryKey(),
  ownerGroupId: uuid("owner_group_id").notNull(),
  key: text("key").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  isPublicRead: boolean("is_public_read").notNull(),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});

export const formTemplateVersions = pgTable("form_template_versions", {
  id: uuid("id").primaryKey(),
  templateId: uuid("template_id").notNull(),
  channel: releaseChannel("channel").notNull(),
  isActive: boolean("is_active").notNull(),
  major: integer("major").notNull(),
  minor: integer("minor").notNull(),
  patch: integer("patch").notNull(),
  fieldDefsJson: jsonb("field_defs_json").notNull(),
  layoutJson: jsonb("layout_json").notNull(),
  rulesJson: jsonb("rules_json").notNull(),
  publishedBy: uuid("published_by"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});

export const entities = pgTable("entities", {
  id: uuid("id").primaryKey(),
  templateId: uuid("template_id").notNull(),
  templateVersionId: uuid("template_version_id").notNull(),
  ownerGroupId: uuid("owner_group_id").notNull(),
  businessKey: text("business_key"),
  status: docStatus("status").notNull(),
  dataJson: jsonb("data_json").notNull(),
  readonlySnapshotJson: jsonb("readonly_snapshot_json").notNull(),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const approvals = pgTable("approvals", {
  id: uuid("id").primaryKey(),
  entityId: uuid("entity_id").notNull(),
  decision: approvalDecision("decision").notNull(),
  actorUserId: uuid("actor_user_id"),
  comment: text("comment"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  valid: boolean("valid").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey(),
  actorUserId: uuid("actor_user_id"),
  eventType: text("event_type").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  payloadJson: jsonb("payload_json"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});
