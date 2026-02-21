# Entity (Document) Lifecycle – P0

Table: `entities`

## Statuses
- DRAFT (editable by EDITOR)
- SUBMITTED (read-only for EDITOR; awaits approval)
- APPROVED_FINAL (immutable)
- REJECTED (P0: keep read-only, or allow EDITOR to edit again - choose one)

P0 default: **REJECTED stays read-only** (simpler).

## Transitions
- Start entity: create row with status DRAFT, lock to active PROD version.
- Save: DRAFT -> DRAFT (update `data_json`, `updated_at`)
- Submit: DRAFT -> SUBMITTED
- Approve: SUBMITTED -> APPROVED_FINAL + insert approvals(decision=APPROVE)
- Reject: SUBMITTED -> REJECTED + insert approvals(decision=REJECT)

## Audit
Each transition writes an `audit_log` record.
