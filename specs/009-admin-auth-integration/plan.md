# Integration plan

Local Staff demo amendment: user requests a persistent account for manual permission testing.
Provision staff.demo@example.test as ACTIVE STAFF with no user_permissions via opt-in migration
013. Generate random credentials in ignored local files; reject duplicates, never reset an
existing account. Test actual Admin grant/revoke over HTTP with separate sessions, retain
the Staff account with zero permissions afterward and keep its audit trail.

2026-10-08 Staff merge validation: fast-forward luong to linh 9e38f03, which already includes
0a5776f. Test the actual Admin permission endpoint with a logged-in Staff session before grant,
after grant and after revoke, including audit persistence. Fixtures are transaction-rolled-back.
For local validation use Flyway target 7 and validation enabled. Do not automatically execute
upstream V8/V9: they rewrite primary roles, publish mentor profiles and assign arbitrary skills
to existing mentors. Those changes exceed a permission integration test and need reconciliation.
This validation does not claim all four Staff capabilities are implemented or protected.

Latest upstream update: merge linh af838c0, preserving the admin work in a separate stash.
Keep unified email/password login and role detection; route ADMIN to #/admin, STAFF to
#/staff/mentor-applications. Keep the new mentee profile implementation and shared logout failure handling.
Apply upstream profile schema scripts as Flyway V5/V6; never rewrite applied V2-V4.
Upstream inserted fixed privileged-account seeds into init, contrary to the immutable baseline rule.
Restore the original init baseline and do not execute privileged or wishlist seed scripts.
Existing local administrator provisioning remains opt-in; no existing accounts are replaced.

Merge linh d592968 after preserving local work in Git stash. Adopt its layered com.happyprogramming packages and shared SecurityConfig, AuthService and session/CSRF mechanism. This explicitly supersedes the older capability-package and separate-admin-login decisions in the admin plan and initial constitution for this integration, consistent with the new package-alignment feature.

Move admin controller/service/repository/DTO/handler to their corresponding layers. Remove the obsolete admin authentication filter chain; use AuthenticatedUser.email rather than Authentication.getName (the principal is a record). Require ROLE_ADMIN at the filter and fresh database admin/status checks at the service boundary. Preserve atomic mutation/audit behavior.

Use shared authService for admin login/logout and /api/auth/csrf for writes. Admin portal redirects to #/admin. Preserve existing public routes and component showcase. Keep demo explicitly separate pending the broader admin reconciliation.

Apply non-seed upstream SQL migrations as Flyway V3/V4 after existing V2; preserve the init baseline. Do not apply wishlist seed credentials. Existing accounts and roles are preserved/backfilled by upstream migration. No production credentials are created.

Verification: shared SQL-backed auth/admin session tests with rollback fixtures and mocked email, admin unit/repository tests, frontend test/build, browser checks if available. Record failures separately from verified outcomes.

Local provisioning amendment: run the explicitly opt-in dated SQL script against local
HappyProgramming only, with an environment-supplied BCrypt hash. It creates a fresh ADMIN and
user_roles membership in one transaction with an audit entry, rejecting duplicate emails.
Credentials are stored only in ignored .system_generated/admin-demo-credentials.txt for handoff.
No startup seed or schema change is introduced. Verify duplicate rejection and shared HTTP auth.
