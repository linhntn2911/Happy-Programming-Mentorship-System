# Tasks

- [x] Record the bounded request history and decision-consistency behavior.
- [x] Expose all persisted mentor requests through an owner-scoped API.
- [x] Show request statuses in mentor request history.
- [x] Ensure failed decisions stay visible and retryable.
- [x] Align request details modal with the shared workspace modal style.
- [x] Keep mentee payment eligibility dependent on the persisted acceptance state.
- [ ] Run the backend mentor service test; Maven Wrapper cannot currently start in this Windows environment.

- [x] Write new request timestamps and the 48-hour deadline using SQL Server UTC time.
- [x] Add a narrowly scoped Flyway correction for pending rows with future submission timestamps, retaining and restoring the lifecycle trigger.
- [ ] Verify the backend package/test after updating UTC timestamp behavior.

- [x] Normalize legacy deadline timestamps in mentor history and decision eligibility while preserving stored application identity.
