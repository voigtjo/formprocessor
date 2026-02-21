import { db } from "./client.js";
import {
  users,
  groups,
  groupMemberships,
  products,
  batches,
  customers,
  customerOrders,
  serials,
  starterTemplates,
} from "./schema.js";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { normalizeTemplateType } from "../formTypes/registry.js";

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

  const serialSeeds = [
    { productName: "Alpha Basic", serialNo: "SN-A-0001", valid: true },
    { productName: "Alpha Basic", serialNo: "SN-A-0002", valid: true },
    { productName: "Beta Plus", serialNo: "SN-B-0001", valid: true },
    { productName: "Beta Plus", serialNo: "SN-B-LEGACY", valid: false },
    { productName: "Gamma Core", serialNo: "SN-G-0001", valid: true },
  ];

  for (const seed of serialSeeds) {
    const product = byName.get(seed.productName);
    if (!product) continue;
    const existing = await db
      .select()
      .from(serials)
      .where(and(eq(serials.productId, product.id), eq(serials.serialNo, seed.serialNo)))
      .limit(1);
    if (!existing.length) {
      await db.insert(serials).values({
        id: randomUUID(),
        productId: product.id,
        serialNo: seed.serialNo,
        valid: seed.valid,
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

  const starterRows = [
    {
      templateType: normalizeTemplateType("PRODUCTION_ORDER_BATCH"),
      name: "PRODUCTION_ORDER_BATCH",
      description: "Starter template for product + batch forms.",
      fieldDefsJson: [
        {
          key: "product_id",
          type: "string",
          label: "Product",
          headerRole: "ASSIGNMENT",
          semantic: "WRITABLE_ENTITY",
          readonly: false,
          required: true,
          lookup: { kind: "api", url: "/api/products?valid=true", valueField: "id", labelField: "name" },
        },
        {
          key: "batch_id",
          type: "string",
          label: "Batch",
          headerRole: "KEY",
          semantic: "WRITABLE_ENTITY",
          readonly: false,
          required: true,
          lookup: { kind: "api", url: "/api/batches?valid=true", valueField: "id", labelField: "code" },
        },
      ],
      layoutJson: {
        title: "Batch Production Form",
        sections: [{ title: "Main", rows: [{ cols: [{ field: "product_id" }, { field: "batch_id" }] }] }],
      },
      rulesJson: [],
    },
    {
      templateType: normalizeTemplateType("PRODUCTION_ORDER_SERIAL"),
      name: "PRODUCTION_ORDER_SERIAL",
      description: "Starter template for product + serial forms.",
      fieldDefsJson: [
        {
          key: "product_id",
          type: "string",
          label: "Product",
          headerRole: "ASSIGNMENT",
          semantic: "WRITABLE_ENTITY",
          readonly: false,
          required: true,
          lookup: { kind: "api", url: "/api/products?valid=true", valueField: "id", labelField: "name" },
        },
        {
          key: "serial_no",
          type: "string",
          label: "Serial No",
          headerRole: "KEY",
          semantic: "WRITABLE_ENTITY",
          readonly: false,
          required: true,
          lookup: { kind: "api", url: "/api/serials?valid=true", valueField: "id", labelField: "code" },
        },
      ],
      layoutJson: {
        title: "Serial Production Form",
        sections: [{ title: "Main", rows: [{ cols: [{ field: "product_id" }, { field: "serial_no" }] }] }],
      },
      rulesJson: [],
    },
    {
      templateType: normalizeTemplateType("CUSTOMER_ORDER"),
      name: "CUSTOMER_ORDER",
      description: "Starter template for customer + order forms.",
      fieldDefsJson: [
        {
          key: "customer_id",
          type: "string",
          label: "Customer",
          headerRole: "ASSIGNMENT",
          semantic: "WRITABLE_ENTITY",
          readonly: false,
          required: true,
          lookup: { kind: "api", url: "/api/customers?valid=true", valueField: "id", labelField: "name" },
        },
        {
          key: "customer_order_id",
          type: "string",
          label: "Order No",
          headerRole: "KEY",
          semantic: "WRITABLE_ENTITY",
          readonly: false,
          required: true,
          lookup: {
            kind: "api",
            url: "/api/customer-orders?valid=true",
            valueField: "id",
            labelField: "order_no",
          },
        },
      ],
      layoutJson: {
        title: "Customer Order Form",
        sections: [{ title: "Main", rows: [{ cols: [{ field: "customer_id" }, { field: "customer_order_id" }] }] }],
      },
      rulesJson: [],
    },
  ];

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
        fieldDefsJson: row.fieldDefsJson,
        layoutJson: row.layoutJson,
        rulesJson: row.rulesJson,
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
