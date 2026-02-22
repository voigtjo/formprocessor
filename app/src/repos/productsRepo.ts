import { and, asc, eq } from "drizzle-orm";

import { db } from "../db/client.js";
import { batches, customerOrders, customers, products, serialNumbers } from "../db/schema.js";

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

  async listBatches(args?: { productId?: string; valid?: boolean }) {
    const where =
      args?.productId && args?.valid === true
        ? and(eq(batches.productId, args.productId), eq(batches.valid, true))
        : args?.productId
          ? eq(batches.productId, args.productId)
          : args?.valid === true
            ? eq(batches.valid, true)
            : undefined;

    const query = db
      .select({ id: batches.id, code: batches.code, product_id: batches.productId, valid: batches.valid })
      .from(batches)
      .orderBy(asc(batches.code));
    if (!where) return query;
    return query.where(where);
  }

  async listSerialNumbers(args?: { productId?: string; valid?: boolean }) {
    const where =
      args?.productId && args?.valid === true
        ? and(eq(serialNumbers.productId, args.productId), eq(serialNumbers.valid, true))
        : args?.productId
          ? eq(serialNumbers.productId, args.productId)
          : args?.valid === true
            ? eq(serialNumbers.valid, true)
            : undefined;

    const query = db
      .select({
        id: serialNumbers.id,
        serial_no: serialNumbers.serialNo,
        product_id: serialNumbers.productId,
        valid: serialNumbers.valid,
      })
      .from(serialNumbers)
      .orderBy(asc(serialNumbers.serialNo));
    if (!where) return query;
    return query.where(where);
  }

  async getProductById(id: string) {
    const rows = await db.select().from(products).where(eq(products.id, id)).limit(1);
    return rows[0];
  }

  async getBatchById(id: string) {
    const rows = await db.select().from(batches).where(eq(batches.id, id)).limit(1);
    return rows[0];
  }

  async getSerialNumberById(id: string) {
    const rows = await db.select().from(serialNumbers).where(eq(serialNumbers.id, id)).limit(1);
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

  async listCustomerOrders(args?: { customerId?: string; valid?: boolean }) {
    const where =
      args?.customerId && args?.valid === true
        ? and(eq(customerOrders.customerId, args.customerId), eq(customerOrders.valid, true))
        : args?.customerId
          ? eq(customerOrders.customerId, args.customerId)
          : args?.valid === true
            ? eq(customerOrders.valid, true)
            : undefined;

    const query = db
      .select({
        id: customerOrders.id,
        order_no: customerOrders.orderNo,
        customer_id: customerOrders.customerId,
        valid: customerOrders.valid,
      })
      .from(customerOrders)
      .orderBy(asc(customerOrders.orderNo));
    if (!where) return query;
    return query.where(where);
  }

  async getCustomerById(id: string) {
    const rows = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
    return rows[0];
  }

  async getCustomerOrderById(id: string) {
    const rows = await db.select().from(customerOrders).where(eq(customerOrders.id, id)).limit(1);
    return rows[0];
  }

  async finalizeBatch(id: string) {
    const rows = await db
      .update(batches)
      .set({ valid: false })
      .where(and(eq(batches.id, id), eq(batches.valid, true)))
      .returning({ id: batches.id });
    return rows[0] ?? null;
  }

  async finalizeSerialNumber(id: string) {
    const rows = await db
      .update(serialNumbers)
      .set({ valid: false })
      .where(and(eq(serialNumbers.id, id), eq(serialNumbers.valid, true)))
      .returning({ id: serialNumbers.id });
    return rows[0] ?? null;
  }

  // Backward-compatible aliases for older call sites.
  async listSerials(args?: { productId?: string; valid?: boolean }) {
    return this.listSerialNumbers(args);
  }

  async getSerialById(id: string) {
    return this.getSerialNumberById(id);
  }

  async finalizeSerial(id: string) {
    return this.finalizeSerialNumber(id);
  }

  async finalizeCustomerOrder(id: string) {
    const rows = await db
      .update(customerOrders)
      .set({ valid: false })
      .where(and(eq(customerOrders.id, id), eq(customerOrders.valid, true)))
      .returning({ id: customerOrders.id });
    return rows[0] ?? null;
  }
}
