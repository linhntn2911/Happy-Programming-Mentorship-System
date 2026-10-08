# Admin REST contract

2026-10-07 amendment: authentication now uses /api/auth/csrf, /api/auth/login (JSON with role ADMIN), and /api/auth/logout. The old admin login/logout endpoints below are retired by specs/009-admin-auth-integration; other admin data contracts remain unchanged.

Base `/api/admin`. JSON responses use existing ApiResponse. Cookie session authentication; no credentials in browser storage. Fetch CSRF token before login and mutations. Every protected request rechecks ACTIVE/ADMIN against the database.

| Method | Path | Behavior |
|---|---|---|
| GET | /csrf | Public: token, headerName for subsequent mutations |
| POST | /login | Form email/password; establishes session, JSON success or 401 |
| POST | /logout | Invalidates session, requires CSRF |
| GET | /session | Current id/name/email; 401 guest, 403 unauthorized |
| GET | /workspace | Users (id/name/email/role/status/createdAt/permissions), settings, immutable audit history and verified payments; protected admin-only snapshot |
| PATCH | /users/{id}/status | JSON status ACTIVE/INACTIVE/LOCKED and nonempty reason; self/admin accounts protected |
| PUT | /users/{id}/permissions | JSON permissions array from canonical allowlist and nonempty reason; target must be STAFF |
| PUT | /settings | JSON commissionRate (0–100, max 2 decimals), supportEmail (valid or empty), reason; historical payments unchanged |

Snapshot supports the initial bounded workspace. Client filters and pagination operate on this complete snapshot. Large datasets require later server-side pagination before scale rollout; no silently truncated results. Errors: 400 validation, 401 unauthenticated, 403 inactive/non-admin, 404 target missing, 409 conflicting account type. Errors never reveal SQL or stack traces. Mutations return success only after audit and data commit together. No audit mutation or payment mutation endpoint.
