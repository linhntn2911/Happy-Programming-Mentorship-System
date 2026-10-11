# Tasks

- [x] Trace the selected tier from the public profile to the create-request API and identify where selection was dropped.
- [x] Specify selected package ID validation and snapshot behavior.
- [x] Preserve offering ID through tier switching, route, application draft, and API payload.
- [x] Validate the selected active monthly offering against the mentor and snapshot its server-side terms.
- [x] Remove fake pricing fallback when a profile has no active packages.
- [x] Run focused frontend and backend tests, plus frontend build.
- [x] Reconcile verification results and manual test steps.

## Verification

- Frontend: 43 tests passed; `npm run build` passed.
- Backend: focused controller, cancellation, and package-selection tests passed.
- Manual check: open a mentor profile, switch to a tier, apply, and confirm the resulting checkout displays that tier's server-snapshotted name, price, call count, and duration.
- No live database row was rewritten. Existing request snapshots remain unchanged; cancel an unpaid stale application and submit a replacement to apply the selected tier.
