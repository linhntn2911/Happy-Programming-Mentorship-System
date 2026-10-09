# Integration tasks

- [x] Merge linh e64ef9d, preserve Staff fail-closed behavior and resolve script numbering collision.
- [x] Run merged full backend/frontend tests and frontend build (110 backend pass, 36 frontend pass).
- [ ] Reconcile and validate upstream V8-V10 on a disposable database before applying to local real data.

- [x] Provision user-requested persistent local Staff with no permissions through migration 013.
- [x] Verify real HTTP Admin grant/Staff access/revoke/denial and audit; leave zero permissions.

## Staff integration validation, 2026-10-08
- [x] Fetch all branches; identify current Staff work in linh 9e38f03 and fast-forward luong.
- [x] Test Admin grant/revoke through HTTP controllers with SQL-backed rollback fixtures.
- [x] Verify CSRF, Staff self-grant denial, permission persistence and two audit entries.
- [x] Run full backend tests and frontend tests/build, record migration limits.
- [ ] Upstream follow-up: enforce permissions on Staff dashboard/mentor/mentee endpoints.
- [ ] Upstream follow-up: replace Staff mock fallbacks with honest error/denied states and live data.
- [ ] Upstream follow-up: reconcile automatic V8/V9 role/publication/skill backfills before enabling them locally.
- [ ] Manual browser walkthrough of all four Staff permissions (not covered by this merge validation).

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
