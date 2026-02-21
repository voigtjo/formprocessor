# Pages and UI Data Requirements (P0)

## /ui (dashboard)
- links to templates and entities

## /ui/forms (templates list)
- list templates owned by current group
- show active PROD version (if any)
- action: create -> /ui/forms/new

## /ui/forms/new
- form: key, name, description (optional)
- submit creates template + initial TEST 1.0.0

## /ui/forms/:templateId
- template meta
- versions table (TEST and PROD) with active flag
- buttons:
  - edit latest TEST
  - publish TEST
  - publish PROD (promote/copy from latest TEST)

## /ui/forms/:templateId/versions/:versionId/edit
- textareas for:
  - field_defs_json
  - layout_json
  - rules_json (optional)
- server validates JSON shape with Zod (reject invalid)

## /ui/entities
- list entities for current group ordered by updated_at
- show status and business_key
- action: start entity from a template (choose template)

## /ui/entities/:entityId
- show status + locked template/version
- show rendered form (from layout_json and field_defs_json) and current data_json
- actions depending on status and role:
  - save draft
  - submit
  - approve/reject
