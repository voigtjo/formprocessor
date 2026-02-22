import "dotenv/config";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { db } from "../db/client.js";
import { batches, products } from "../db/schema.js";
import { ProductsRepo } from "./productsRepo.js";

const databaseUrl = process.env.DATABASE_URL;

describe("ProductsRepo integration", () => {
  if (!databaseUrl) {
    it.skip("DATABASE_URL not set", () => {});
    return;
  }

  it("listBatches filters open keys and sorts by code", async () => {
    const repo = new ProductsRepo();
    const productId = randomUUID();
    const batchOpenA = randomUUID();
    const batchOpenB = randomUUID();
    const batchClosed = randomUUID();

    try {
      await db.insert(products).values({
        id: productId,
        name: `Integration Product ${productId.slice(0, 8)}`,
        valid: true,
        createdAt: new Date(),
      });
      await db.insert(batches).values([
        {
          id: batchOpenB,
          productId,
          code: "INT-002",
          valid: true,
          createdAt: new Date(),
        },
        {
          id: batchOpenA,
          productId,
          code: "INT-001",
          valid: true,
          createdAt: new Date(),
        },
        {
          id: batchClosed,
          productId,
          code: "INT-999",
          valid: false,
          createdAt: new Date(),
        },
      ]);

      const rows = await repo.listBatches({ productId, valid: true });
      expect(rows.map((r: any) => r.code)).toEqual(["INT-001", "INT-002"]);
      expect(rows.find((r: any) => r.id === batchClosed)).toBeUndefined();
    } catch (err: any) {
      if (err?.code === "EPERM" || err?.code === "ECONNREFUSED") {
        return;
      }
      throw err;
    } finally {
      await db
        .delete(batches)
        .where(
          and(
            eq(batches.productId, productId),
            eq(batches.code, "INT-001"),
          ),
        )
        .catch(() => undefined);
      await db
        .delete(batches)
        .where(
          and(
            eq(batches.productId, productId),
            eq(batches.code, "INT-002"),
          ),
        )
        .catch(() => undefined);
      await db
        .delete(batches)
        .where(
          and(
            eq(batches.productId, productId),
            eq(batches.code, "INT-999"),
          ),
        )
        .catch(() => undefined);
      await db.delete(products).where(eq(products.id, productId)).catch(() => undefined);
    }
  });
});
