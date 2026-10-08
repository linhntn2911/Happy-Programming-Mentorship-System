# Merged authentication validation (2026-10-07)

2026-10-08 follow-up: the Staff authorization/mock-data gaps below are superseded for current
read routes by specs/011-staff-permission-enforcement/quickstart.md. All four permission
read boundaries are now tested; full skill/request mutation workflows remain out of scope.

## Persistent Staff demo, 2026-10-08
User-authorized local migration 013 created staff.demo@example.test as ACTIVE STAFF with
zero permissions. Random password is only in ignored .system_generated/staff-demo-credentials.txt.
Actual HTTP test through frontend proxy with separate Admin/Staff sessions: directory contains
the account; review queue 403 before grant, 200 after Admin grant, 403 after revoke on the
same Staff session. Workspace readback confirms zero final permissions and two matching audit
records. Both test sessions logged out. Account retained for manual UI testing; reload the
Staff directory to see it. No claim that the three other Staff capabilities are complete.

## Staff merge validation, 2026-10-08

Merged origin/linh 9e38f03 into local luong (fast-forward; includes existing Admin commit
0a5776f). No conflict, no push for this update; unrelated SRS document preserved.
Backend Maven test: 95 discovered, 90 passed, 5 skipped. Frontend: 26 passed; build passed.
New AuthControllerTest validates no grant -> 403, Admin grant -> 200, Admin revoke -> 403
on the same Staff session for mentor application review. It also verifies CSRF rejection,
Staff self-grant denial, empty final permissions and two database audit records. All fixtures
roll back; no persistent test Staff account is created. This is HTTP-controller integration
coverage, not a claim of a completed browser walkthrough for all permission types.

Local backend restarted on 8083 with SPRING_FLYWAY_TARGET=7 and
SPRING_FLYWAY_VALIDATE_ON_MIGRATE=true, plus working local DB environment variables.
V7 notification table applied successfully; prior versions validated without checksum repair.
Use those overrides for subsequent local starts until migration review is complete.
V8 rewrites mentor primary roles; V9 makes active mentor profiles public/accepting and assigns
Docker/JavaScript skills broadly. They were deliberately not applied by this validation.

Remaining upstream findings: StaffController's dashboard/mentors/mentees methods have no
role/permission guard beyond authentication. StaffService supplies sample data; staffService.js
catches API errors (including denial) and returns mock data, obscuring revoked permissions in
the UI. The protected mentor-application API grant/revoke passed; this does not establish
completion of MENTEE_MANAGE, MENTORSHIP_REQUEST_MANAGE or SKILL_MANAGE features.

## Latest merge: linh af838c0

- Local main fast-forwarded to origin/linh af838c0; original admin changes restored from
  stash `backup admin before linh af838c0 merge`, retained for recovery. LoginPage and
  AccountPage conflicts resolved; no unresolved Git entries. No commit or push performed.
- Unified login has no role tabs: use #/login, email/password only. ADMIN redirects to
  #/admin; STAFF retains upstream #/staff/mentor-applications. Mentee profile retained.
- Restored immutable init to its pre-merge content instead of accepting upstream fixed
  privileged-account seeds. No seed scripts executed. Flyway V5/V6 applied successfully,
  preserving previously applied V2-V4 and existing data.
- Initial Maven attempt failed because upstream changed default DB credentials. Re-ran
  using the previous local DB_USERNAME/DB_PASSWORD as process environment variables,
  without printing credentials. Configure these variables before future backend runs.
- Full Maven test: 40 discovered, 39 passed, 1 opt-in LiveDatabaseTest skipped; includes
  13 auth tests and 4 upstream profile tests. Frontend: 9 passed and Vite build passed.
- Restarted latest backend on 127.0.0.1:8083; frontend 5174 proxies to it. Actual HTTP
  through Vite: login without role detected ADMIN, workspace 200, logout success, then
  workspace 401. Existing local admin credentials remain ignored and unchanged.
- Browser verified the unified login rendered email/password with no role selection.
  Successful browser login/navigation remains unverified; successful auth is HTTP-tested.
- Upstream StaffService still returns in-memory sample dashboard/mentor/mentee data.
  Its new /api/staff/dashboard, /mentors and /mentees routes currently only require
  authentication via SecurityConfig, without staff-role checks in StaffController/Service.
  This is an upstream gap requiring a separate scoped authorization/data implementation;
  do not consider that staff module ready. Existing mentor-application review checks and
  admin role protections remain covered. Admin SRS gaps below are unchanged.

The following sections retain evidence from the earlier d592968 integration. The latest
results above supersede its login-tab instructions and test/migration counts.

## Setup and run

Use the existing local SQL Server database via DB_URL, DB_USERNAME and DB_PASSWORD.
Do not run the baseline init against an existing database. Flyway baselines at V1 and applies
V2 audit integrity, V3 structured names, and V4 mentor application/role changes.
V3/V4 copy the matching dated upstream scripts in docs/database/migration. No wishlist seed
or default admin credential is applied.

In backend, run `mvnw.cmd spring-boot:run -Dspring-boot.run.arguments=--server.port=8083`.
In frontend PowerShell, set `$env:VITE_API_PROXY_TARGET='http://127.0.0.1:8083'`, then
`npm.cmd run dev -- --host 127.0.0.1 --port 5174 --strictPort`.
Open http://127.0.0.1:5174/#/login?portal=staff and choose Admin.
An existing ACTIVE admin with a BCrypt password is required for manual live login.

## Evidence

- Upstream merged: linh d592968; pre-merge admin work retained in Git stash.
- Database: V3/V4 applied successfully, schema now V4; existing baseline untouched.
- Backend: Maven test, 35 discovered, 34 passed, 1 opt-in LiveDatabaseTest skipped.
- AuthControllerTest: 12 passed with SQL transaction fixtures and mocked email, including
  admin shared login/session/workspace/logout, session invalidation, CSRF, inactive admin,
  additional ADMIN role and revocation, and STAFF/MENTEE denial.
- Frontend: 9 tests passed; production build passed. Logout failure keeps local identity
  and provides retry instead of pretending the server session was terminated.
- Browser: Staff/Admin portal rendered; unauthenticated admin route rendered login;
  invalid admin login showed pending then server rejection, with controls re-enabled.
- Merge conflict scan and git diff whitespace check passed.

## Convergence and limitations

Admin uses the same authentication session and CSRF endpoints as the public app. Its data
routes keep backend role checks and revalidate current database admin access. The principal
record is resolved by email, not Authentication.getName(). Admin code follows the layered
com.happyprogramming packages. Authenticated ADMIN redirects to #/admin; account labels include
Admin/Staff. Existing explicit demo is preserved, and successful live login clears demo mode.

No persistent admin account was created. Successful browser login with a real account remains
unverified; server-side end-to-end request flow is covered by SQL-backed MockMvc tests.
This integration does not finish the previously identified SRS settings/report/account-detail
gaps or all responsive/accessibility scenarios. Older admin tasks retain those outstanding items.
No remote push was performed. Local changes remain reviewable and uncommitted.

## Local account follow-up (user-authorized)

On 2026-10-07, explicitly provisioned admin.demo@example.test with the opt-in dated
20261007_provision_local_demo_admin.sql script. Password is random and held only in ignored
.system_generated/admin-demo-credentials.txt; SQL stores BCrypt only. No startup seed added.
The first SQL attempt failed due to QUOTED_IDENTIFIER required by computed-column indexes;
the transaction rolled back. After declaring the required SET options, provisioning succeeded.
Actual HTTP verification with this account: login success / ADMIN, workspace success,
logout success, then workspace returns 401. This supersedes the earlier no-account limitation.
Backend is running locally on 8083. Browser successful-login walkthrough remains unverified.
