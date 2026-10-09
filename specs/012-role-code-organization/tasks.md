> Historical note: backend role-folder placement was superseded by `specs/013-backend-package-diagram`; the frontend role layout remains current.

# Tasks

- [x] Inventory existing modules and role ownership.
- [x] Move frontend modules and update imports.
- [x] Move backend classes/tests and update Java packages/imports.
- [x] Update AGENTS.md, CLAUDE.md, and architecture guidance.
- [x] Run frontend tests/build and backend tests; resolve any failures.
- [x] Review file counts, diff whitespace, and stale active imports.

## Integration into luong, 2026-10-09
Merged linh 3191c43. Retained live Staff service behavior at its new role path and removed the old path. Kept opt-in migration 014 refusing existing accounts, requiring an external hash and assigning no automatic grants; upstream password-reset/default-password behavior was intentionally not adopted. Fixed StaffAccessService references in two moved MVC tests. Frontend: 36 tests passed and production build passed. Backend: 115 discovered, 110 passed, 5 skipped after fixing the initial test compilation errors. Database remains at V7; V8-V10 lifecycle/backfills and live end-to-end payment behavior remain unverified. No database provisioning scripts were executed during this merge.
