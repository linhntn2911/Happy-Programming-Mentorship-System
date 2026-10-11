# Plan: Mentor Request History and Decisions

## Architecture
- Keep request lifecycle on the existing `dbo.mentorship_requests` row.
- Expose an owner-scoped mentor request history read through the existing mentor service/controller.
- Keep the dashboard's pending count sourced from backend status, without local browser suppression.
- Make decision requests fail visibly and refresh the list from the backend after a persisted decision.
- Keep mentee payment eligibility tied to the current persisted request status.

## Security and compatibility
- Resolve mentor identity from the authenticated active mentor context.
- Do not expose mentee or mentor records across account boundaries.
- Keep the fix non-destructive: write request lifecycle timestamps with SQL Server UTC functions and correct only pending requests whose submission timestamp is in the future (an impossible state) by the observed Vietnam UTC+7 offset. The migration disables the lifecycle trigger only within one transaction, then restores it before commit; errors roll back the transaction. Preserve request IDs and history.

## Timestamp handling
- SQL Server writes `submitted_at`, `response_deadline`, `terms_accepted_at`, `created_at`, and `updated_at` using `SYSUTCDATETIME()` so `datetime2` values remain UTC wall time regardless of JVM timezone.
- Package the UTC correction as Flyway V12 while keeping the canonical migration source in `docs/database/migration/`. Normalize legacy future timestamps in mentor list responses and decision eligibility until the migration runs.

## Validation
- Add service tests for the all-status mentor history query mapping and decision failure behavior.
- Add frontend tests for CSRF-protected decision requests and history/status UI.
- Run focused frontend tests and the backend mentor controller/service tests.
