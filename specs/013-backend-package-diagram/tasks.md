# Tasks

- [x] Compare the diagram, current packages, and Git state.
- [x] Move backend source and tests to layer packages without changing behavior.
- [x] Update imports, package declarations, and fully qualified references.
- [x] Align AGENTS.md, CLAUDE.md, architecture docs, and supersession notes.
- [x] Run Maven tests and inspect for stale role package references.
- [x] Review source counts and final diff.

## Integration into luong, 2026-10-09
Merged linh 58e05a7 following the user's request to synchronize the latest branch. Its backend layer layout supersedes the previous backend role layout; frontend role folders remain unchanged. Updated StaffAccessService references in two MVC tests after automatic merge. Maven clean test: 115 discovered, 110 passed, 5 skipped. Frontend: 36 tests passed; production build passed. No schema or provisioning scripts executed; local database remains V7. Upstream V8-V10 data backfills/payment lifecycle remain outside this verification. Existing local account safeguards and live Staff service retained.
