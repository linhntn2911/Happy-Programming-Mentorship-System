# Tasks

- [x] Read repository guidance, baseline SPEC, application/payment SRS requirements, and current checkout implementation.
- [x] Specify the VNPay checkout outcome and acceptance criteria.
- [x] Record the backend, callback, and frontend plan and API contract.
- [x] Implement VNPay v2.1.0 HMAC-SHA512 gateway URL/signature utilities and focused tests.
- [x] Replace browser-side instant settlement with owner-scoped pending attempt creation and signed redirect.
- [x] Implement validated, idempotent IPN settlement and informational browser return.
- [x] Expose actual checkout/package/payment state; remove mock bank transfer and fake success UI.
- [x] Display and copy a unique payment reference before opening the VNPay QR page; send it in the VNPay order fields.
- [x] Add focused backend/frontend tests, run required build/tests, and record unavailable external checks.
- [x] Run Spec Kit convergence and record remaining external setup requirement.
- [x] Recover a missing legacy offer snapshot only when the exact linked package is provably unchanged since application submission; persist it before creating payment.
- [x] Keep checkout display and payment eligibility aligned when an old application's package price cannot be verified.
- [x] Add safe mentee cancellation for unpaid applications so stale package applications can be replaced while retaining history.

## Verification

- Frontend: `npm test` (41 passed) and `npm run build` passed.
- Backend: Maven 3.9.9 from the local wrapper cache completed `mvn test` (125 tests, 0 failures, 5 skipped). The checked-in PowerShell wrapper itself still fails before Maven starts (`Cannot index into a null array`).
- No SQL Server payment rows or mock payment records were inserted by the feature tests. The live VNPay redirect/IPN transaction was not tested because this environment has no merchant credentials or publicly reachable IPN URL.
- No migration was needed; the existing baseline schema already contains the required payment and escrow records.
