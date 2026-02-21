# Routing (P0)

Pages:
- GET /ui
- GET /ui/forms
- GET /ui/forms/new
- GET /ui/forms/:templateId
- GET /ui/entities
- GET /ui/entities/:entityId

Actions:
- POST /ui-actions/forms                (create template)
- POST /ui-actions/forms/:templateId/publish-test
- POST /ui-actions/forms/:templateId/publish-prod
- POST /ui-actions/entities/start       (create entity from active prod template)
- POST /ui-actions/entities/:id/save
- POST /ui-actions/entities/:id/submit
- POST /ui-actions/entities/:id/approve
- POST /ui-actions/entities/:id/reject

Responses:
- Action returns 303 redirect for navigation.
- In later steps: return HTMX partials for inline updates.
