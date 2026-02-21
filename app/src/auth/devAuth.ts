import type { FastifyRequest } from "fastify";
import { db } from "../db/client.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";

export type CurrentUser = {
  id: string;
  email: string;
  displayName?: string | null;
  globalRole?: "GLOBAL" | "USER";
};

declare module "fastify" {
  interface FastifyRequest {
    currentUser?: CurrentUser;
  }
}

export async function requireDevUser(req: FastifyRequest) {
  const email = process.env.DEV_USER_EMAIL;
  if (!email) {
    const err: any = new Error("DEV_USER_EMAIL not set");
    err.statusCode = 401;
    throw err;
  }

  const row = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!row.length) {
    const err: any = new Error(`Dev user not found: ${email}. Run: npm run seed`);
    err.statusCode = 401;
    throw err;
  }

  const u = row[0] as any;
  req.currentUser = {
    id: u.id,
    email: u.email,
    displayName: u.displayName ?? null,
    globalRole: (u.globalRole as any) ?? "USER",
  };
}
