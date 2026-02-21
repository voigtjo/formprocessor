# Usecases – Audit (P0)

Audit is append-only.

Events:
- template.created
- template.version.saved
- template.published.test
- template.published.prod
- entity.created
- entity.saved
- entity.submitted
- entity.approved
- entity.rejected

Each event includes:
- actor_user_id
- entity_type + entity_id
- payload_json with minimal details
