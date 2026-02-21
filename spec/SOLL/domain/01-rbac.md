# RBAC (Role-based access control) – P0

## Global role
- `GLOBAL`: may manage users, groups, memberships, connector grants (connectors out of scope in P0 UI).

## Group roles (per group)
- `ADMIN`
- `MANAGER`
- `EDITOR`
- `MEMBER`

### Permission mapping (P0)

Resource: **Template**
- Read template list/detail: MEMBER+
- Create template: ADMIN+
- Edit TEST draft (layout/fields/rules): ADMIN+
- Publish TEST: MANAGER+
- Publish PROD: MANAGER+
- Set public read flag: ADMIN+ (optional P0)

Resource: **Entity (Document)**
- Read entity list/detail: MEMBER+ (within group) and public-read rules (optional)
- Start entity: EDITOR+
- Save draft: EDITOR+ and status must be DRAFT
- Submit: EDITOR+ and status DRAFT -> SUBMITTED
- Approve/Reject: MANAGER+ and status SUBMITTED -> APPROVED_FINAL / REJECTED

### Notes
- `ADMIN` can do everything in TEST, but **does not approve in P0** (approval reserved for MANAGER).
- For simplicity, P0 assumes a single "current group context" (default group).
