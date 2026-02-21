import Fastify from "fastify";
import formbody from "@fastify/formbody";
import view from "@fastify/view";
import ejs from "ejs";
import fastifyStatic from "@fastify/static";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { registerUiRoutes } from "./routes/ui.js";
import { requireDevUser } from "./auth/devAuth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = Fastify({ logger: true });

app.register(formbody);
app.register(fastifyStatic, { root: path.join(__dirname, "public"), prefix: "/public/" });
app.register(view, { engine: { ejs }, root: path.join(__dirname, "views"), viewExt: "ejs" });

app.get("/healthz", async () => ({ ok: true }));

// DEV auth for all routes except healthz
app.addHook("preHandler", async (req) => {
  if (req.url.startsWith("/healthz")) return;
  await requireDevUser(req);
});

registerUiRoutes(app);

const port = Number(process.env.PORT || 3000);
app.listen({ port, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});