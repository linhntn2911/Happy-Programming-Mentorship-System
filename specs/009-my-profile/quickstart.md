# Validation
Apply docs/database/migration/003_20261007_add_my_profile.sql using the configured SQL Server connection, then restart backend. Login as Mentee, open account menu > My profile. Edit/save, reload, verify persistence and menu name. Cancel restores last saved text. Upload PNG/JPEG, reload and remove. Invalid images/URLs and oversized input must fail while preserving saved data. Anonymous requests must fail; CSRF is required for updates.
Verification results recorded after implementation.

## Results — 2026-10-07
- Additive migration applied successfully to configured SQL Server. Initial schema untouched. No seeds added.
- Maven full test suite: 25 tests, 0 failures, 0 errors, including 4 profile integration tests on SQL Server with transactional rollback.
- Verified own-profile persistence/reload, immutable identity/role, required authentication/CSRF, inactive account rejection, invalid input/URL rejection, private avatar upload/read/remove and invalid-image rejection.
- Frontend production build passed (35 modules). Existing user edits preserved.
- Maven wrapper could not resolve its distribution under the sandbox account; used installed Maven 3.9.11 with Java 17.0.17, isolated local repository C:/Users/pc/Documents/Codex/.m2-profile and -Dmaven.compiler.fork=false. No project build configuration changed.
- Browser interaction/visual checks were not run against an authenticated account. Restart the existing backend before trying My profile; existing process was not interrupted. Open http://localhost:5173/#/account after login and follow the manual steps above.
- Reuses existing TextInput, navigation button/user dropdown, Tailwind tokens, card/form patterns; no new visual design-system pattern or mobile-specific work.
