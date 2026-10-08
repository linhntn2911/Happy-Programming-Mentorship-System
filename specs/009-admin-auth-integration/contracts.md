# Shared authentication contract

Staff integration: PUT /api/admin/users/{id}/permissions replaces the Staff permission set
with CSRF and an audit reason. GET /api/staff/mentor-applications rechecks
MENTOR_APPLICATION_MANAGE on every request; grant and revoke apply to existing sessions.
No /api/v1 prefix is introduced despite the older Staff specification's examples.

POST /api/auth/login: JSON email/password plus current CSRF token; omitted role auto-detects the primary database role. Optional role=ADMIN remains supported for the admin workspace login and is checked against database membership. Returns AuthenticatedUser and server session. GET /api/auth/me revalidates identity. POST /api/auth/logout invalidates session, clears cookie; requires CSRF. GET /api/auth/csrf provides token/headerName.

Latest upstream adds nullable users.learning_goals and files.avatar_content, and FRESHER to the user experience-level constraint, through Flyway V5/V6 copies of upstream scripts 002/003.

Existing /api/admin/session, /workspace, /users/{id}/status, /users/{id}/permissions and /settings retain response and mutation DTOs. All require current active ADMIN. Mutations require CSRF. /api/admin/login and /logout are replaced by shared auth endpoints; frontend updated together. No passwords or tokens stored in browser storage.

Persistent changes: nullable users.first_name/last_name; user_roles membership table/backfill; mentor application OTP/CV columns, exactly as upstream versioned SQL. Existing audit migration stays unchanged.
