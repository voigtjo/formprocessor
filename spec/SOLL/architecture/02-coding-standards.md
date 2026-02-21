# Coding Standards (P0)

## TypeScript
- `strict: true`
- No `any` unless justified and localized.
- Use Zod for validating request payloads in routes/services.
- Use explicit types for service inputs/outputs.

## Error handling
- Domain errors are thrown as typed errors and mapped in routes to HTTP status codes.
- Always log with request id (`req.id` from Fastify).

## Naming
- Service methods start with verbs: `createTemplate`, `publishProd`, `startEntity`.
- Repo methods start with data verbs: `insertTemplate`, `getActiveProdVersion`.
