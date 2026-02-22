# UI Route Map (P0)

## Pages
- `GET /ui`
- `GET /ui/forms`
- `GET /ui/forms/new`
- `GET /ui/forms/:templateId`
- `GET /ui/start` (primary start page)
- `GET /ui/entities` -> `302 /ui/start` (legacy)
- `GET /ui/entities/:entityId`
- `GET /ui/orders` -> `302 /ui/start?type=BATCH_PRODUCTION_ORDER` (legacy wrapper)
- `GET /ui/customer-orders` -> `302 /ui/start?type=CUSTOMER_ORDER` (legacy wrapper)

## UI Actions
- `POST /ui-actions/forms`
- `POST /ui-actions/forms/:templateId/save-test`
- `POST /ui-actions/forms/:templateId/publish-test`
- `POST /ui-actions/forms/:templateId/publish-prod`
- `POST /ui-actions/forms/:templateId/header-config`
- `POST /ui-actions/forms/:templateId/reset-starter`
- `POST /ui-actions/forms/:templateId/delete`
- `POST /ui-actions/start`
- `POST /ui-actions/entities/:entityId/save`
- `POST /ui-actions/entities/:entityId/submit`
- `POST /ui-actions/entities/:entityId/approve`
- `POST /ui-actions/entities/:entityId/reject`
- `POST /ui-actions/entities/:entityId/delete`

## Lookup APIs
- `GET /api/products?valid=true`
- `GET /api/customers?valid=true`
- `GET /api/batches?product_id=...&valid=true`
- `GET /api/serial-numbers?product_id=...&valid=true`
- `GET /api/customer-orders?customer_id=...&valid=true`

All POST UI actions use `303` redirects on success.
