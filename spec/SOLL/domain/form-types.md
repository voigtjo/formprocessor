# Form Types (P0)

Supported template types:

- `PRODUCTION_ORDER`
- `CUSTOMER_ORDER`

## Header Mapping

Each template can define:

- `assignment_field`
- `key_field`

Defaults:

- `PRODUCTION_ORDER`: `assignment_field='product_id'`, `key_field='batch_id'`
- `CUSTOMER_ORDER`: `assignment_field='customer_id'`, `key_field='customer_order_id'`

## Entity System Header

Order entities persist a system header under `entities.data_json._header`:

```json
{
  "assignment": { "type": "product|customer", "id": "<uuid>", "label": "<name>" },
  "key": { "type": "batch|customer_order", "id": "<uuid>", "label": "<business key text>" }
}
```

`entities.business_key` stores `key.label`.
