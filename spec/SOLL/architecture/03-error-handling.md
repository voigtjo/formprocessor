# Error Handling (P0)

## Error Types
- `AuthError` -> 401
- `ForbiddenError` -> 403
- `NotFoundError` -> 404
- `ValidationError` -> 400
- `ConflictError` -> 409 (e.g. publish prod when none exists)

## Response format (HTML)
Pages render an error page or a minimal error message.
Actions:
- return 303 redirect with flash message (P0 simplification), or
- return 4xx with plain text message (acceptable P0).

## Logging
- Log error with `req.id`, `currentUser.email`, route, and error name.
