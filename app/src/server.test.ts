import { describe, it, expect } from "vitest";
import Fastify from "fastify";

describe("healthz", () => {
  it("returns ok", async () => {
    const app = Fastify();
    app.get("/healthz", async () => ({ ok: true }));
    const res = await app.inject({ method: "GET", url: "/healthz" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });
});
