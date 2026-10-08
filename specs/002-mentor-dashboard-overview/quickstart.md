# Mentor Dashboard Quickstart

## Prerequisites

- Java 17 and Maven for the current `backend/pom.xml` setting.
- Node.js/npm with frontend dependencies installed.
- A SQL Server instance listening at the configured `DB_URL` (default `localhost:1433`, database `HappyProgramming`).
- A valid SQL Server password supplied through `DB_PASSWORD`; do not store it in tracked files.
- An active mentor user and matching profile for local-only dashboard demo access.

The backend demo identity is opt-in. In PowerShell, set a valid local mentor ID and enable the local-only switch:

```powershell
$env:MENTOR_DEMO_ENABLED = "true"
$env:MENTOR_DEMO_USER_ID = "<local-active-mentor-user-id>"
$env:DB_PASSWORD = "<local-sql-server-password>"
```

Never enable the demo identity in a deployed environment. Real authenticated mentor sessions are not implemented in this project yet.

The Vite development client calls `/api/mentors/me/profile`, `/api/mentors/me/dashboard`, and `/api/skills?active=true`; `vite.config.js` proxies these paths to `http://localhost:8080`. The shared API client sends JSON headers, preserves explicitly supplied headers, and aborts requests after 10 seconds. In development only, unavailable/unauthorized/server-error GET responses are replaced with clearly labelled sample data so the pages can be previewed; sample dashboards disable decisions and sample profiles are read-only. No sample update is reported as persisted. Production builds do not use these fallbacks.

## Run

From repository root:

```powershell
mvn -f backend\pom.xml spring-boot:run
```

In another terminal:

```powershell
Set-Location frontend
npm run dev
```

Open the frontend and use **Mentor dashboard**. The app reads the dashboard through the API and provides retry behavior for a failed request.

## Validate

```powershell
mvn -f backend\pom.xml -Dtest=MentorDashboardServiceTest,MentorDashboardControllerTest test
mvn -f backend\pom.xml test
Set-Location frontend
npm run build
npm test
```

`npm test` runs dashboard/profile, API-client timeout, route, and development-fallback regression tests with Node.js's built-in test runner. SQL Server-backed tests must run with a reachable database and the required test identity configuration.

Dashboard database integration tests are opt-in. Supply `HPMS_MENTOR_TEST_USER_ID`, `HPMS_MENTOR_TEST_REQUEST_ID`, and `DB_PASSWORD`, ensure the request ID is a pending, unexpired request owned by that mentor, then run:

```powershell
mvn -f backend\pom.xml -Dhpms.dashboard.integration=true -Dtest=MentorDashboardTransactionIntegrationTest test
```

The decision integration test runs transactionally and rolls back its state change.

The generic live-database smoke test is also opt-in. With SQL Server and the expected seed data available, run `mvn -f backend\pom.xml -Dhpms.database.integration=true -Dtest=HpmsApplicationTests test`.

Manually verify:

1. A mentor sees earnings, pending invitations, average rating/review count, and recent notices scoped to that mentor.
2. Details reveals full learning goals; active request buttons update the row and summary without creating payment records.
3. A deadline that has elapsed disables both decision actions, and a repeated/conflicting request does not create a second transition.
4. Database failures show retryable errors rather than success-shaped data.
5. At 320px, 768px, and 1440px, there is no horizontal page overflow; controls work by keyboard and focus remains visible.

If `Could not open JPA EntityManager for transaction` appears, inspect the deepest nested cause and first verify the SQL Server service/port, database name, login credentials, and driver URL. Hikari tuning cannot repair an unavailable SQL Server.
