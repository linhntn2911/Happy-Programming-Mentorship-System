# Feature Specification: Automatic Monthly Subscription Lifecycle

## Goal

Monthly mentorship state follows its paid dates without requiring the mentor or mentee to finish the package manually.

## User scenarios

### US-01 — Finish the trial automatically

Given a paid monthly subscription in `TRIALING`, when `trial_ends_at` is reached while the paid period is still current, the system changes it to `ACTIVE`.

### US-02 — End an unrenewed paid period automatically

Given a monthly subscription in `TRIALING`, `ACTIVE`, or `PAST_DUE`, when `current_period_end` is reached without a renewal extending that date, the system changes it to `ENDED`.

## Requirements

- Lifecycle processing is idempotent and safe to repeat.
- Expired paid periods are ended before completed trials are activated.
- `DISPUTED`, `CANCELLED`, and `ENDED` subscriptions are never changed by this job.
- Ending a subscription preserves its record, payment, escrow, review, refund, dispute, and audit references.
- An ended subscription no longer grants monthly workspace access. An independently eligible one-off engagement may continue to grant access to the shared relationship workspace.
- No mentor or mentee Finish action is introduced.

## Success criteria

- A completed trial becomes active within one configured scan interval.
- An unrenewed paid period ends within one configured scan interval.
- Repeating the job produces no further change after the first valid transition.
