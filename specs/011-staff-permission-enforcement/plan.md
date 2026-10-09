# Plan
Reuse shared session/CSRF, layered packages, Admin assignment API and user_permissions.
Add repository-backed StaffAccessService and MVC interceptor for all /api/staff paths.
Read current users status, locked_until and role membership on every request; deny unknown
Staff routes. Keep existing mentor application service's checks as defense in depth.
Replace mock StaffService with live JDBC read DTOs; dashboard omits unauthorized metrics.
Add read-only skills/requests DTO endpoints and reusable table page. Remove client fallback
arrays and render explicit denied/error/retry. Refresh identity at each Staff mount.
No change to baseline or Flyway migrations. Run SQL-backed rollback permission matrix tests,
frontend service failure tests and builds; inspect browser access-denied and table states.
Older Staff specification /api/v1 examples are superseded by canonical /api endpoints.

## Local account provisioning follow-up (2026-10-08)
User requested a dedicated local Admin and three Staff for manual permission review. This is operational seed data using existing authentication and assignment contracts, not an authentication/schema change. Opt-in migration 015 atomically inserts four ACTIVE, verified users and matching roles with UTC audit records; refuses any existing target email. Staff receive no grants. BCrypt12 hashes come from environment variables, independently random passwords remain only in ignored .system_generated/accounts-credentials.txt. No automatic Flyway inclusion or existing account modification. Remove these temporary records/mechanism once the real account creation flow is complete. Verify all four logins, Admin directory visibility and Staff denial before handing off.
