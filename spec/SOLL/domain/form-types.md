# Form Types (P0)

Supported template types:

- `BATCH_PRODUCTION_ORDER`
- `SERIAL_PRODUCTION_ORDER`
- `CUSTOMER_ORDER`

## Header Mapping

Each template stores editable header config:

- `assignment_field`
- `key_field`

Defaults:

- `BATCH_PRODUCTION_ORDER`: `assignment_field='product_id'`, `key_field='batch_id'`
- `SERIAL_PRODUCTION_ORDER`: `assignment_field='product_id'`, `key_field='serial_number_id'`
- `CUSTOMER_ORDER`: `assignment_field='customer_id'`, `key_field='customer_order_id'`

## Start Flow (Bidirectional)

Route: `GET /ui/start`

- Assignment-first: assignment selection filters key options (`valid=true`).
- Key-first: key selection infers and auto-selects assignment.
- Form type switch resets dependent values (`templateId`, `assignmentId`, `keyId`).
- Placeholder/empty query params must not trigger UUID parse errors.

`POST /ui-actions/start` requires:

- `type`
- `templateId` (uuid)
- `assignmentId` (uuid)
- `keyId` (uuid)

## Open vs Final

- Master data (`products`, `customers`) use `valid=true`.
- Key tables use `valid=true` as open:
  - `batches`
  - `serial_numbers`
  - `customer_orders`
- No separate "Finalize key" UI action.
- Key finalization runs in approve transition (`SUBMITTED -> APPROVED_FINAL`) by setting selected key row `valid=false`.

## Entity Header Snapshot

At start, `entities.data_json` stores both reference IDs and display snapshots:

- IDs: `product_id/customer_id`, `batch_id/serial_number_id/customer_order_id`
- Snapshot labels: `product_name/customer_name`, `batch_code/serial_no/order_no`

`_header` remains as system metadata.
