# Codex Startprompt (P0)

Implement P0 strictly according to spec/SOLL/**.

## Stack
Node.js + TypeScript, Fastify, Postgres, Drizzle, Zod, EJS + HTMX.

## P0 required features
- Dev auth using DEV_USER_EMAIL (already wired in server.ts)
- Seed: npm run seed creates dev@local + group default + membership MANAGER
- Templates + Versions (TEST/PROD, SemVer, active PROD unique)
- Entities lifecycle (DRAFT->SUBMITTED->APPROVED_FINAL/REJECTED)
- Approvals + audit_log
- RBAC role logic (ADMIN/MANAGER/EDITOR/MEMBER)

## Implementation order
1) Drizzle mappings in src/db/schema.ts (done)
2) repos/ services/ for templates + entities
3) UI pages and HTMX actions (routes)
4) tests for each action route: happy + denied

Do not add connectors or macro engine in P0.
