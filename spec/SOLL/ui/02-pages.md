# Pages and UI Data Requirements (P0)

## /ui/forms
- list templates for current group
- columns include template type + active TEST/PROD status

## /ui/forms/new
- inputs: key, name, description, template_type
- starter JSON prefilled from server-side starter generator by template type

## /ui/forms/:templateId
- template metadata + versions
- header config editor (`assignment_field`, `key_field`)
- TEST JSON editor + preview
- reset-to-starter uses template type + current header config
- delete template blocked if entities exist

## /ui/start
- form type dropdown (`BATCH_PRODUCTION_ORDER`, `SERIAL_PRODUCTION_ORDER`, `CUSTOMER_ORDER`)
- template dropdown filtered by selected form type + active TEST
- assignment dropdown (select placeholder)
- key dropdown
  - assignment-first: filtered keys
  - key-first: infer assignment
- start creates DRAFT entity with ID refs + snapshot labels in `data_json`
- existing table shows template/version/status/assignment/key/created

## /ui/entities/:entityId
- top shows template/type/version/status
- header box shows assignment + key snapshot labels
- business key shown separately (optional)
- actions:
  - DRAFT: Save, Submit, Delete
  - SUBMITTED: Approve, Reject
  - APPROVED_FINAL/REJECTED: read-only
- no standalone "Finalize key" button
- approve transition finalizes selected key row (`valid=false`) in key table
