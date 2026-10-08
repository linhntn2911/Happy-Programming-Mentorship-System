# Quickstart: Mentor Profile Persistence Foundation

## Prerequisites

- Java 25 and Maven are available.
- SQL Server is running locally and the `HappyProgramming` database already matches `docs/database/init/schema_31_tables.sql`.
- Set `DB_PASSWORD` in the process environment before starting the backend. Do not put the password in tracked files.
- Set `MENTOR_DEMO_ENABLED=true` and `MENTOR_DEMO_USER_ID` to an existing active mentor account/profile user ID only in an isolated local development session. Leave demo mode disabled everywhere else.

PowerShell example for a local terminal session:

```powershell
$securePassword = Read-Host "Local SQL Server password" -AsSecureString
$env:DB_PASSWORD = (New-Object System.Net.NetworkCredential("", $securePassword)).Password
$env:MENTOR_DEMO_ENABLED = "true"
$env:MENTOR_DEMO_USER_ID = "123"
Set-Location backend
mvn test
```

The configured default database URL targets `localhost:1433/HappyProgramming` with SQL Server certificate trust enabled for local development. `DB_URL` and `DB_USERNAME` may be overridden as environment variables. The mentor demo ID example is a placeholder; use a real local database user ID and never enable this mode on a deployed server.

During Vite development, a failed profile or active-skills GET caused by an unavailable API, disabled demo identity, or server error shows clearly labelled sample data so the editor does not remain on its loading state. The preview is read-only; profile PUT still requires the backend and is never reported as saved from sample data. Frontend API requests time out after 10 seconds. Outside development builds, API errors remain visible and no sample data is substituted.

## Validation

```powershell
Set-Location backend
mvn test
```

Expected checks:

- Production and test sources compile.
- DTO validation rejects invalid profile data.
- JPA mappings address existing tables and columns without schema generation.
- Mentor skill repository queries return active skill tags only.
- Existing featured mentor controller contract remains unchanged.
- `/api/mentors/me/profile` GET/PUT operate only on the fixed configured demo mentor.
- `/api/skills?active=true` returns only currently active skill catalog rows.
- Saving an empty skill selection, a duplicate ID, or an inactive/unknown ID is rejected without partial updates.
- The rollback integration test requires `DB_PASSWORD`, `HPMS_MENTOR_TEST_USER_ID`, and a local SQL Server account that is an active mentor with a profile and at least one active skill.
- The editor validates profile fields and displays loading, error, and success states.
- Frontend profile and dashboard requests leave loading state after success, API errors, or request timeout; development fallback is labelled and read-only.

Database-dependent tests require the configured local SQL Server instance. This implementation does not create tables or change database contents.
