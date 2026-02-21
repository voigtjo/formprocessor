# Techstack (fixed)

- Postgres
- Node.js + TypeScript
- Fastify
- Drizzle ORM
- Zod
- EJS templates
- HTMX for actions/partials
- Tailwind later (optional)

Conventions:
- Pages: GET /ui/** render full EJS pages.
- Actions: POST /ui-actions/** return HTMX fragments or 303 redirects.
- Layering:
  - routes/
  - services/
  - repos/
  - views/
