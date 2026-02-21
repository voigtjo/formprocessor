# FormProcessor – SOLL Specifications (P0)

## Goal
Build a production-grade **application platform + form processing app** to replace Word/ActiveX form documents.
P0 focuses on the core platform + JSON template model + document lifecycle, **without** external connectors and without macro migration.

## What is P0?
### Platform (P0)
- Users (GLOBAL role) and Group memberships (ADMIN/MANAGER/EDITOR/MEMBER)
- Role-based authorization (no ACL table in P0)
- Audit log (append-only)
- UI routing model: pages + HTMX actions
- Template + versioning workflow (TEST/PROD) with a single active PROD version per template
- Document (entity) lifecycle: draft/save/submit/approve/reject

### Forms (P0)
- JSON-based form model:
  - `field_defs_json` (field definitions and mapping metadata)
  - `layout_json` (render layout)
  - `rules_json` (stored but **not executed in P0**, only persisted)

## Out of Scope (P0)
- Multitenancy
- Visual form builder (UI builder)
- External connectors (HTTP/DB/SAP)
- Macro conversion / rule execution engine
- File upload and attachments
- Search / full-text / reporting

## Success Criteria
- `npm run dev` starts the app
- `/ui` renders and navigation works
- CRUD + publish workflow works for templates/versions
- Entities can be started, edited (draft), submitted, approved/rejected
- Role restrictions enforced (denied paths tested)
- `npm test` passes (Vitest + Supertest)

## Repo Layout
- `spec/` = source of truth
- `app/` = implementation
- `tests/` = higher-level test harness (P0 tests live under `app/` to keep setup minimal)
