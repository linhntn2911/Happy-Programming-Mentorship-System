# Verification, 2026-10-08

Backend: full Maven suite 95 discovered, 90 passed, 5 skipped. First run had 14 context
errors in two existing Mentor MVC slices after introducing StaffAccessConfig. Added
StaffAccessService mocks to those slices (no production bypass), rerun passed.
Frontend: 29 tests passed, Vite production build passed.

SQL-backed transactional AuthControllerTest covers all four independent permission mappings:
anonymous 401, no grant 403, grant 200, unrelated grants 403, revoke 403 on the same session.
Staff self-grant and missing CSRF denied. Eight grant/revoke audit entries verified.
Inactive, future-locked and role-removed Staff cannot access dashboard/access.
Existing application decision, CV, session and Admin protections remain covered.

Actual running HTTP verification through port 5174 with separate Admin/Staff sessions:
MENTOR_APPLICATION_MANAGE, MENTEE_MANAGE, MENTORSHIP_REQUEST_MANAGE and SKILL_MANAGE each
returned 403 -> 200 -> 403. Restored the demo Staff's original permissions in finally and
logged out both test sessions. Credentials never printed or committed.

Browser verified anonymous skills route shows explicit login-required error and keyboard Tab
focus visibly reaches Skip to content. Page-handler unit checks cover denied/error rendering
for all six Staff pages; API failures no longer turn into sample data or empty success.
Authenticated browser walkthrough of each page is not claimed; success verified over HTTP.

Backend running on 8083 with existing local DB environment, SPRING_FLYWAY_TARGET=7 and
SPRING_FLYWAY_VALIDATE_ON_MIGRATE=true. Frontend on 5174. Do not apply upstream V8/V9
automatically: previously documented role/publication/skill backfills remain out of scope.

Convergence: all implemented Staff routes are mapped to fresh DB authorization; lists read
SQL and dashboard does not expose metrics for unassigned capabilities. Existing UI components
and styling reused; no new design-system primitive or schema. Unknown mapped Staff sections
fail closed. Existing open data cannot be erased from a browser after revocation, but subsequent
API requests and page mounts recheck access.

Scope boundary: skills and mentorship requests are read-only views. This change does not
implement skill creation/editing/status changes or payment-sensitive request transitions.
Mentor profile fee/CV fields absent from the directory projection remain unavailable rather
than fabricated. Recent dashboard activity is not yet implemented. No push performed.

Local provisioning follow-up: applied opt-in migration 015 to HappyProgramming. All four new accounts authenticated successfully through port 5174; Admin workspace returned all three new Staff. Each Staff received HTTP 403 for mentors, mentees, requests and skills before assignment (12 checks). All verification sessions logged out. Staff remain without grants for the user's manual review. Credentials are in ignored .system_generated/accounts-credentials.txt; no application code or schema changed.
