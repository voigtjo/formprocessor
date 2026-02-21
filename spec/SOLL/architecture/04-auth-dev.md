# Authentication (P0)

P0 uses a **dev-only** authentication mechanism.

## Mechanism
- Environment variable: `DEV_USER_EMAIL`
- For each request, server loads `users` row by email.
- If missing -> 401.

## Seed requirement
To run locally, the database must include:
- a user with email = DEV_USER_EMAIL
- a default group
- membership of the dev user in that group (role ADMIN or MANAGER)

Seed script must be provided in app:
- `npm run seed` (or `node dist/seed.js`), creates user/group/membership if missing.

## Future
Real auth will later replace dev auth (password or OIDC).
