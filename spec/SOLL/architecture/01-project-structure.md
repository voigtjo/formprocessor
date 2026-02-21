# Project Structure (P0)

## Directories
- `app/src/routes`  
  HTTP routes. Only request parsing, auth, call service, render views.
- `app/src/services`  
  Domain operations (use cases). Authoritative business rules.
- `app/src/repos`  
  Database access (Drizzle queries).
- `app/src/db`  
  Drizzle client + (optional) table mappings.
- `app/src/views`  
  EJS pages + partials.
- `app/src/public`  
  CSS, static assets.

## Routing conventions
- Pages (HTML full pages): `GET /ui/**`
- Actions (mutations via HTMX or normal POST): `POST /ui-actions/**`
- Health: `GET /healthz`
- Later APIs: `/api/**` (not needed in P0)

## Composition rules
- Routes call **services** only (no DB queries directly in routes).
- Services call **repos** only (no SQL in services).
- Repos do DB only.
