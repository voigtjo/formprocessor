# FormProcessor

Folders:
- spec/  SOLL specs (source of truth)
- app/   Node/TS/Fastify/Drizzle/EJS/HTMX scaffold
- tests/ future integration tests

Run app:
cd app
cp .env.example .env
npm install
npm run dev

Health check:
GET http://localhost:3000/healthz
# formprocessor
