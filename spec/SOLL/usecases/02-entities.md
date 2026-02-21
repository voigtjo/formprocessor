# Usecases – Entities (P0)

## UC-E1 Start entity (EDITOR)
Input: templateId, optional business_key
Steps:
1. role >= EDITOR
2. get active PROD version for template; if none -> ConflictError
3. insert entity with status DRAFT and template_version_id locked
Output: redirect to entity detail

## UC-E2 Save draft (EDITOR)
Input: entityId, data_json
Steps:
1. role >= EDITOR
2. ensure entity.status == DRAFT
3. validate data_json is object
4. update entities.data_json, updated_at
Output: redirect to entity detail

## UC-E3 Submit (EDITOR)
Steps:
1. role >= EDITOR
2. ensure status DRAFT
3. set status SUBMITTED
4. audit
Output: redirect

## UC-E4 Approve / Reject (MANAGER)
Steps:
1. role >= MANAGER
2. ensure status SUBMITTED
3. insert approvals row
4. update entity status accordingly
5. audit
Output: redirect
