# Roles (P0)

Global role:
- GLOBAL: manage users/groups/memberships (P0 UI can be added later)

Group roles (role logic):
- ADMIN: create templates; edit TEST drafts; PROD read-only
- MANAGER: publish TEST/PROD; approve/reject
- EDITOR: start entities; save; submit
- MEMBER: read templates and entities

P0 simplifies auth:
- start with a hard-coded "dev user" (header or env), later replace with real login.
