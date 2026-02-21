# UI Route Map (P0)

## Pages
- GET /ui
- GET /ui/forms
- GET /ui/forms/new
- GET /ui/forms/:templateId
- GET /ui/forms/:templateId/versions/:versionId/edit   (edit JSON)
- GET /ui/entities
- GET /ui/entities/:entityId

## Actions
- POST /ui-actions/forms                                 (create template)
- POST /ui-actions/forms/:templateId/versions/:id/save    (save JSON)
- POST /ui-actions/forms/:templateId/publish-test
- POST /ui-actions/forms/:templateId/publish-prod

- POST /ui-actions/entities/start
- POST /ui-actions/entities/:entityId/save
- POST /ui-actions/entities/:entityId/submit
- POST /ui-actions/entities/:entityId/approve
- POST /ui-actions/entities/:entityId/reject

P0 uses redirects after actions.
