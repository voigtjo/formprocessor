import { db } from "./client.js";
import { users, groups, groupMemberships, products } from "./schema.js";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "node:crypto";

async function main() {
  const email = process.env.DEV_USER_EMAIL || "dev@local";

  // upsert user
  const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const userId = existingUser[0]?.id ?? randomUUID();

  if (!existingUser.length) {
    await db.insert(users).values({
      id: userId,
      email,
      displayName: "Dev User",
      isActive: true,
      globalRole: "USER",
      authIdentity: {},
      createdAt: new Date(),
    });
  }

  // upsert group
  const groupName = "default";
  const existingGroup = await db.select().from(groups).where(eq(groups.name, groupName)).limit(1);
  const groupId = existingGroup[0]?.id ?? randomUUID();

  if (!existingGroup.length) {
    await db.insert(groups).values({
      id: groupId,
      name: groupName,
      createdAt: new Date(),
    });
  }

  // upsert membership
  const existingMembership = await db
    .select()
    .from(groupMemberships)
    .where(and(eq(groupMemberships.groupId, groupId), eq(groupMemberships.userId, userId)))
    .limit(1);

  if (!existingMembership.length) {
    await db.insert(groupMemberships).values({
      groupId,
      userId,
      role: "MANAGER",
      createdAt: new Date(),
    });
  }

  const productSeeds = [
    { name: "Alpha Basic", valid: true },
    { name: "Beta Plus", valid: true },
    { name: "Gamma Core", valid: true },
    { name: "Delta Kit", valid: false },
    { name: "Epsilon Prime", valid: true },
    { name: "Foxtrot Standard", valid: true },
    { name: "Helios Legacy", valid: false },
    { name: "Ion Max", valid: true },
    { name: "Juno Starter", valid: true },
    { name: "Kappa Lab", valid: false },
    { name: "Lumen One", valid: true },
    { name: "Nova Flex", valid: true },
  ];

  for (const item of productSeeds) {
    const existing = await db.select().from(products).where(eq(products.name, item.name)).limit(1);
    if (!existing.length) {
      await db.insert(products).values({
        id: randomUUID(),
        name: item.name,
        valid: item.valid,
        createdAt: new Date(),
      });
    }
  }

  console.log("Seed done:", { email, userId, groupId });
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
