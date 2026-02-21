import { asc, eq } from "drizzle-orm";

import { db } from "../db/client.js";
import { products } from "../db/schema.js";

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
}
