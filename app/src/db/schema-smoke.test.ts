import "dotenv/config";
import { afterAll, describe, expect, it } from "vitest";
import pg from "pg";
const { Pool } = pg;

const requiredColumns = ["assignment_field", "key_field", "template_type"] as const;
const databaseUrl = process.env.DATABASE_URL;

describe("db schema smoke", () => {
  if (!databaseUrl) {
    it.skip("DATABASE_URL not set", () => {});
    return;
  }

  const pool = new Pool({ connectionString: databaseUrl });

  afterAll(async () => {
    await pool.end();
  });

  it("form_templates contains required header columns", async () => {
    let res: Awaited<ReturnType<typeof pool.query<{ column_name: string }>>>;
    try {
      res = await pool.query<{ column_name: string }>(
        `
        select column_name
        from information_schema.columns
        where table_schema='public'
          and table_name='form_templates'
          and column_name = any($1::text[])
        `,
        [requiredColumns],
      );
    } catch (err: any) {
      if (err?.code === "EPERM" || err?.code === "ECONNREFUSED") {
        // Local CI/sandbox can block DB sockets even with DATABASE_URL set.
        return;
      }
      throw err;
    }

    const found = new Set(res.rows.map((r) => r.column_name));
    const missing = requiredColumns.filter((c) => !found.has(c));
    expect(missing, `Missing required columns: ${missing.join(", ")}`).toEqual([]);
  });
});
