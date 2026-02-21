# Usecases – Templates (P0)

## UC-T1 Create template (ADMIN)
Input: key, name, description
Steps:
1. check role >= ADMIN
2. insert into form_templates with owner_group_id=currentGroup
3. insert initial TEST version 1.0.0 with empty JSON
Output: redirect to template detail page

## UC-T2 Save JSON version (ADMIN)
Input: versionId, field_defs_json, layout_json, rules_json
Steps:
1. role >= ADMIN
2. ensure channel == TEST
3. validate JSON (Zod)
4. update version row JSON columns
Output: redirect back to edit page (with success message)

## UC-T3 Publish TEST (MANAGER)
Simplified:
- mark latest TEST version active (is_active=true)
- optionally deactivate other TEST actives
Output: redirect to template detail

## UC-T4 Publish PROD (MANAGER)
Simplified:
1. select latest TEST version (or active TEST)
2. create new PROD version with copied JSON and semver bump (patch++)
3. set new PROD active; deactivate prior active PROD
Output: redirect to template detail
