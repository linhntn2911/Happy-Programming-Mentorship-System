# Tasks
- [x] Fetch and merge origin/linh b77a53f into luong (fast-forward).
- [x] Read root agent policies and directly affected implementations.
- [x] Resolve OTP timing and exclusive 10K threshold; separate fixed fee defaults to zero.
- [x] Persist operational settings with validation, active Admin authorization, CSRF and audit.
- [x] Add maintenance enforcement and safe public announcement/status.
- [x] Add Admin UI using existing visual system and review confirmation.
- [x] Integrate OTP settings, server cooldown and frontend timing.
- [x] Integrate minimum payout, confirmed fee snapshots, hold snapshots and gross/fee/net displays.
- [x] Reconcile authoritative wallet/payment documentation.
- [x] Run backend suite and focused reruns against isolated SQL Server; migration V22 verified.
- [x] Run frontend tests, production build, static label/escaping checks.
- [x] Convergence audit: implementation, contract, migration and automated scenarios agree.
- [ ] Manually verify rendered UI and keyboard focus in the live application. Browser policy blocked file:// visual preview; no bypass attempted.
- [ ] Apply/restart the user's normal local application with its private datasource configuration. Only the isolated test database was migrated during verification.

## Verification record
Fresh full backend run (2026-10-26): 417 tests, 410 passed, 7 conditionally skipped, no failures/errors. The full run originally exposed one test fixture reading old encrypted rows from the shared test database; the new fee test was isolated to its own mentor and the affected integration suite passed on rerun. New OperationalSettingsIntegrationTest verifies save/read/audit, authorization/CSRF/validation and maintenance recovery. Frontend: 150/150 passed; production build passed. See verification.md for remaining limits.
