# Staff API
All routes require an active unlocked STAFF or ADMIN membership read from the database.
GET /api/staff/access: current identity plus permissions (all four for Admin).
GET /api/staff/dashboard: metrics only for granted capabilities, unauthorized metrics null.
GET /api/staff/mentors and /mentor-applications/**: MENTOR_APPLICATION_MANAGE.
GET /api/staff/mentees: MENTEE_MANAGE.
GET /api/staff/requests: MENTORSHIP_REQUEST_MANAGE; read-only request DTO list.
GET /api/staff/skills: SKILL_MANAGE; read-only skill DTO list including inactive records.
Existing mentor application decision/CV contracts unchanged. CSRF remains required for writes.
Unauthorized 401, denied 403 using ApiResponse.error; no fallback data.
