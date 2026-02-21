import { db } from "../db/client.js";
import { groupMemberships } from "../db/schema.js";
import { eq, and } from "drizzle-orm";

export type GroupRole = "ADMIN" | "MANAGER" | "EDITOR" | "MEMBER";

export async function requireGroupRole(args: {
  userId: string;
  groupId: string;
  allowed: GroupRole[];
}) {
  const rows = await db
    .select()
    .from(groupMemberships)
    .where(and(eq(groupMemberships.groupId, args.groupId), eq(groupMemberships.userId, args.userId)))
    .limit(1);

  const role = rows[0]?.role as GroupRole | undefined;
  if (!role || !args.allowed.includes(role)) {
    const err: any = new Error(`RBAC denied: need ${args.allowed.join(", ")}`);
    err.statusCode = 403;
    err.role = role ?? "NONE";
    throw err;
  }

  return role;
}
