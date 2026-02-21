# Template Versioning – P0

## Entities
- `form_templates` is the stable identity (`key`, `name`, `owner_group_id`).
- `form_template_versions` contains versioned artifacts:
  - `field_defs_json`
  - `layout_json`
  - `rules_json` (stored only in P0)
  - channel: TEST or PROD
  - semver: major/minor/patch
  - `is_active` for selecting the current release within a channel

## Rules
- Each template may have multiple TEST versions and multiple PROD versions.
- Only **one** PROD version may be active at a time (enforced by unique partial index).
- Entities lock `template_version_id` at creation time.

## P0 publish behavior (simple)
- Publish TEST:
  - create a new TEST version or mark latest TEST version active (implementation choice)
- Publish PROD:
  - create a new PROD version by copying the chosen TEST version OR promote TEST->PROD copy
  - set it active and deactivate previously active PROD

## Initial version
- When a template is created, system creates an initial TEST version: `1.0.0` with empty JSON.
