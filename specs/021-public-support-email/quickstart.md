# Support email configuration

This setting publishes a contact address; it does not configure SMTP or create a mailbox.

## Use
1. Sign in as an active administrator and open `/#/admin/settings`.
2. Enter an existing support inbox in **Support email**, retain the intended commission value, and provide a reason.
3. Select **Review changes** and confirm. Reload settings to verify persistence.
4. Open a public page with the shared footer. **Contact support** opens the configured address in the visitor's email application.
5. Clear the email and save with a reason to hide the contact link on the next public-page mount/reload.

No new environment variable, schema migration, or SMTP password is required. The existing `platform.support_email` configuration row remains authoritative. The public endpoint exposes only this value; database failures show a retry state.

## Verification — 2026-10-14
- Focused backend: PublicContactControllerTest, PublicContactServiceTest, AdminRepositoryTest — 10 passed.
- Frontend: `npm test` — 59 passed; `npm run build` passed.
- Covered: anonymous allowlisted read, protected admin writes, sanitized failure, whitespace normalization, invalid address rejection, storage read isolation, save/clear persistence, audit rollback, footer loading/empty/error/retry, HTML escaping and detached responses.
- Accessibility source check: contact is a native anchor; retry is a native button; both have visible focus styles; status updates use `role="status"`. Existing Admin fields retain associated labels. Browser keyboard and live Admin-to-footer checks have not yet been performed.
- Full backend: 158 tests, 152 passed, 6 skipped, zero failures/errors. Ran against the existing isolated `HPMS_SePay_Test_20261012` database using `.system_generated/run-payment-tests.ps1`.

## Convergence
Implementation matches the bounded API and data-model artifacts. No migration or unrelated payment change is introduced. Automated acceptance coverage passes. Live-browser verification remains unperformed and is not claimed by these results.
