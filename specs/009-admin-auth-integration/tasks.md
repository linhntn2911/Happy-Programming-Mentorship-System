# Integration tasks

## Latest linh af838c0 merge
- [x] Fetch and preserve local changes; reconcile login/profile conflicts.
- [x] Preserve unified login, admin redirect and logout behavior; retain upstream profile.
- [x] Add Flyway profile migrations without modifying applied versions; restore immutable init baseline.
- [x] Run backend/frontend regression checks and verify live admin login/logout after restart.
- [x] Record final merge evidence and limitations.

- [x] Preserve changes and merge upstream linh.
- [x] Specify shared auth, package and migration boundaries.
- [x] Resolve merge and migrate admin to layered packages/shared authentication.
- [x] Integrate frontend routes and shared login/logout.
- [x] Apply non-seed migrations and verify database compatibility.
- [x] Verify admin auth/authorization/logout and application checks.
- [x] Record convergence evidence and remaining limitations.

Follow-up requiring a supplied real admin account: successful browser login/logout walkthrough.
Backend success/logout is verified through transactional SQL-backed MockMvc tests, not a browser claim.

## User-requested local demo account (2026-10-07)
- [x] Record opt-in provisioning design and dated migration; reject existing email.
- [x] Generate random credentials outside Git; provision local admin with BCrypt and audit.
- [x] Verify real HTTP login (ADMIN), workspace access, logout and subsequent 401.
