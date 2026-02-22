import { db } from "./client.js";
import {
  users,
  groups,
  groupMemberships,
  products,
  batches,
  customers,
  customerOrders,
  serialNumbers,
  starterTemplates,
} from "./schema.js";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { normalizeTemplateType } from "../formTypes/registry.js";
import { getStarterTemplate } from "../formTypes/starterTemplates.js";

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

  const allProducts = await db.select().from(products);
  const byName = new Map(allProducts.map((p: any) => [p.name as string, p]));
  const batchSeeds = [
    { productName: "Alpha Basic", code: "ALPHA-001", valid: true },
    { productName: "Alpha Basic", code: "ALPHA-002", valid: true },
    { productName: "Beta Plus", code: "BETA-001", valid: true },
    { productName: "Beta Plus", code: "BETA-LEGACY", valid: false },
    { productName: "Gamma Core", code: "GAMMA-001", valid: true },
    { productName: "Epsilon Prime", code: "EPS-001", valid: true },
  ];

  for (const seed of batchSeeds) {
    const product = byName.get(seed.productName);
    if (!product) continue;
    const existing = await db
      .select()
      .from(batches)
      .where(and(eq(batches.productId, product.id), eq(batches.code, seed.code)))
      .limit(1);
    if (!existing.length) {
      await db.insert(batches).values({
        id: randomUUID(),
        productId: product.id,
        code: seed.code,
        valid: seed.valid,
        createdAt: new Date(),
      });
    }
  }

  const validProducts = allProducts.filter((p: any) => p.valid);
  for (let pIndex = 0; pIndex < validProducts.length; pIndex += 1) {
    const product = validProducts[pIndex];
    for (let i = 1; i <= 10; i += 1) {
      const serialNo = `SN-${String(pIndex + 1).padStart(2, "0")}-${String(i).padStart(6, "0")}`;
      const existing = await db
        .select()
        .from(serialNumbers)
        .where(and(eq(serialNumbers.productId, product.id), eq(serialNumbers.serialNo, serialNo)))
        .limit(1);
      if (!existing.length) {
        await db.insert(serialNumbers).values({
          id: randomUUID(),
          productId: product.id,
          serialNo,
          valid: true,
          createdAt: new Date(),
        });
      }
    }
  }

  const closedSerialProduct = validProducts[0];
  if (closedSerialProduct) {
    const closedSerialNo = `SN-${String(1).padStart(2, "0")}-999999`;
    const existingClosed = await db
      .select()
      .from(serialNumbers)
      .where(and(eq(serialNumbers.productId, closedSerialProduct.id), eq(serialNumbers.serialNo, closedSerialNo)))
      .limit(1);
    if (!existingClosed.length) {
      await db.insert(serialNumbers).values({
        id: randomUUID(),
        productId: closedSerialProduct.id,
        serialNo: closedSerialNo,
        valid: false,
        createdAt: new Date(),
      });
    }
  }

  const customerSeeds = [
    { name: "Acme Corp", valid: true },
    { name: "Bluebird GmbH", valid: true },
    { name: "Citrine AG", valid: true },
    { name: "Dormant Customer", valid: false },
  ];

  for (const item of customerSeeds) {
    const existing = await db.select().from(customers).where(eq(customers.name, item.name)).limit(1);
    if (!existing.length) {
      await db.insert(customers).values({
        id: randomUUID(),
        name: item.name,
        valid: item.valid,
        createdAt: new Date(),
      });
    }
  }

  const allCustomers = await db.select().from(customers);
  const customerByName = new Map(allCustomers.map((c: any) => [c.name as string, c]));
  const customerOrderSeeds = [
    { customerName: "Acme Corp", orderNo: "CO-1001", valid: true },
    { customerName: "Acme Corp", orderNo: "CO-1002", valid: true },
    { customerName: "Bluebird GmbH", orderNo: "BB-2001", valid: true },
    { customerName: "Bluebird GmbH", orderNo: "BB-OLD", valid: false },
    { customerName: "Citrine AG", orderNo: "CT-3001", valid: true },
  ];

  for (const seed of customerOrderSeeds) {
    const customer = customerByName.get(seed.customerName);
    if (!customer) continue;
    const existing = await db
      .select()
      .from(customerOrders)
      .where(and(eq(customerOrders.customerId, customer.id), eq(customerOrders.orderNo, seed.orderNo)))
      .limit(1);
    if (!existing.length) {
      await db.insert(customerOrders).values({
        id: randomUUID(),
        customerId: customer.id,
        orderNo: seed.orderNo,
        valid: seed.valid,
        createdAt: new Date(),
      });
    }
  }

  const starterRows = await Promise.all([
    (async () => {
      const tpl = await getStarterTemplate("BATCH_PRODUCTION_ORDER");
      return {
        templateType: normalizeTemplateType("BATCH_PRODUCTION_ORDER"),
        name: "BATCH_PRODUCTION_ORDER",
        description: "Starter template for product + batch forms.",
        ...tpl,
      };
    })(),
    (async () => {
      const tpl = await getStarterTemplate("SERIAL_PRODUCTION_ORDER");
      return {
        templateType: normalizeTemplateType("SERIAL_PRODUCTION_ORDER"),
        name: "SERIAL_PRODUCTION_ORDER",
        description: "Starter template for product + serial forms.",
        ...tpl,
      };
    })(),
    (async () => {
      const tpl = await getStarterTemplate("CUSTOMER_ORDER");
      return {
        templateType: normalizeTemplateType("CUSTOMER_ORDER"),
        name: "CUSTOMER_ORDER",
        description: "Starter template for customer + order forms.",
        ...tpl,
      };
    })(),
  ]);

  for (const row of starterRows) {
    const existing = await db
      .select()
      .from(starterTemplates)
      .where(eq(starterTemplates.templateType, row.templateType))
      .limit(1);
    if (!existing.length) {
      await db.insert(starterTemplates).values({
        id: randomUUID(),
        templateType: row.templateType,
        name: row.name,
        description: row.description,
        fieldDefsJson: row.fieldDefsJson as any,
        layoutJson: row.layoutJson as any,
        rulesJson: row.rulesJson as any,
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
