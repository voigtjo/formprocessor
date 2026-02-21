# Domain model (P0)

Tables already exist:
- users, groups, group_memberships
- form_templates, form_template_versions
- entities
- approvals
- audit_log
- (connectors tables exist but not used in P0)

Template Version rules:
- Each template has semver (major/minor/patch)
- Can publish TEST and PROD
- Only one active PROD per template
- Entity locks template_version_id at creation time

Entity lifecycle:
- DRAFT: editable
- SUBMITTED: read-only for editor; manager can approve/reject
- APPROVED_FINAL: immutable
- REJECTED: editable again or not (P0: read-only, keep simple)
