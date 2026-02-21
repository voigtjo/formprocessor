import { and, asc, eq } from "drizzle-orm";

import { db } from "../db/client.js";
import { batches, customerOrders, customers, products, serials } from "../db/schema.js";

export class ProductsRepo {
  async listProducts(args?: { valid?: boolean }) {
    if (args?.valid === true) {
      return db
        .select({ id: products.id, name: products.name })
        .from(products)
        .where(eq(products.valid, true))
        .orderBy(asc(products.name));
    }

    return db
      .select({ id: products.id, name: products.name })
      .from(products)
      .orderBy(asc(products.name));
  }

  async listBatches(args: { productId: string; valid?: boolean }) {
    if (args.valid === true) {
      return db
        .select({ id: batches.id, code: batches.code })
        .from(batches)
        .where(and(eq(batches.productId, args.productId), eq(batches.valid, true)))
        .orderBy(asc(batches.code));
    }

    return db
      .select({ id: batches.id, code: batches.code })
      .from(batches)
      .where(eq(batches.productId, args.productId))
      .orderBy(asc(batches.code));
  }

  async listSerials(args: { productId: string; valid?: boolean }) {
    if (args.valid === true) {
      return db
        .select({ id: serials.id, code: serials.serialNo })
        .from(serials)
        .where(and(eq(serials.productId, args.productId), eq(serials.valid, true)))
        .orderBy(asc(serials.serialNo));
    }

    return db
      .select({ id: serials.id, code: serials.serialNo })
      .from(serials)
      .where(eq(serials.productId, args.productId))
      .orderBy(asc(serials.serialNo));
  }

  async getProductById(id: string) {
    const rows = await db.select().from(products).where(eq(products.id, id)).limit(1);
    return rows[0];
  }

  async getBatchById(id: string) {
    const rows = await db.select().from(batches).where(eq(batches.id, id)).limit(1);
    return rows[0];
  }

  async getSerialById(id: string) {
    const rows = await db.select().from(serials).where(eq(serials.id, id)).limit(1);
    return rows[0];
  }

  async listCustomers(args?: { valid?: boolean }) {
    if (args?.valid === true) {
      return db
        .select({ id: customers.id, name: customers.name })
        .from(customers)
        .where(eq(customers.valid, true))
        .orderBy(asc(customers.name));
    }

    return db
      .select({ id: customers.id, name: customers.name })
      .from(customers)
      .orderBy(asc(customers.name));
  }

  async listCustomerOrders(args: { customerId: string; valid?: boolean }) {
    if (args.valid === true) {
      return db
        .select({ id: customerOrders.id, order_no: customerOrders.orderNo })
        .from(customerOrders)
        .where(and(eq(customerOrders.customerId, args.customerId), eq(customerOrders.valid, true)))
        .orderBy(asc(customerOrders.orderNo));
    }

    return db
      .select({ id: customerOrders.id, order_no: customerOrders.orderNo })
      .from(customerOrders)
      .where(eq(customerOrders.customerId, args.customerId))
      .orderBy(asc(customerOrders.orderNo));
  }

  async getCustomerById(id: string) {
    const rows = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
    return rows[0];
  }

  async getCustomerOrderById(id: string) {
    const rows = await db.select().from(customerOrders).where(eq(customerOrders.id, id)).limit(1);
    return rows[0];
  }
}
