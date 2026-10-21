# Tasks: Automatic Monthly Subscription Lifecycle

- [x] T1 Reconcile the lifecycle behavior with refund, payment, workspace, and dispute specifications.
- [x] T2 Add the idempotent subscription lifecycle repository updates.
- [x] T3 Add the transactional lifecycle service and scheduled job.
- [x] T4 Add configuration for enabling and scheduling the job.
- [x] T5 Add focused repository, service, and scheduler unit tests.
- [x] T6 Run focused backend verification and record the result.

## Verification

- Focused lifecycle regression suite: 6 tests passed, 0 failures, 0 errors, 0 skipped.
- The broader Spring workspace/controller run was attempted but stopped after the existing Windows JVM attach/context-start limitation produced no progress before assertions.
