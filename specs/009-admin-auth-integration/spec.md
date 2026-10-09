# Shared admin authentication integration

User request (2026-10-07): synchronize linh, merge existing admin, and test.

Administrators must sign in through the shared authentication portal and reach the existing admin workspace. Logout must invalidate the shared session. Anonymous and non-admin users must not access admin APIs; revoked or inactive admins must lose access on subsequent requests. Preserve mentor, mentee, staff and homepage flows, existing data and unfinished admin feature work.

Acceptance: ADMIN login -> admin session/workspace -> logout -> unauthorized; STAFF/MENTEE cannot read admin workspace; admin writes require CSRF; database upgrades preserve existing rows; applications build and meaningful regression checks pass. Demo is not evidence of live authentication.

Scope excludes completing unrelated SRS dashboard/report/settings gaps and remote publishing.

User amendment 2026-10-07: provision one local demo administrator so the user can log in manually.
Generate a random password outside Git, store only BCrypt in SQL, never promote/replace an existing
account, and record provisioning in audit. Verify login, workspace access and logout.
