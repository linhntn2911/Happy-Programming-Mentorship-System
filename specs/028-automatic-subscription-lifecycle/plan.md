# Implementation Plan: Automatic Monthly Subscription Lifecycle

## Architecture

- Add `SubscriptionLifecycleRepository` for the two bounded SQL Server updates.
- Add `SubscriptionLifecycleService` as the transaction boundary and enforce end-before-activate ordering.
- Add `SubscriptionLifecycleJob`, enabled by configuration and scheduled with a configurable fixed delay.
- Reuse the existing subscription schema; no migration or public API change is required.

## State transitions

1. Change `TRIALING`, `ACTIVE`, and `PAST_DUE` rows to `ENDED` when `current_period_end <= SYSUTCDATETIME()`.
2. Change remaining `TRIALING` rows to `ACTIVE` when `trial_ends_at <= SYSUTCDATETIME()` and `current_period_end > SYSUTCDATETIME()`.
3. Preserve `DISPUTED`, `CANCELLED`, and `ENDED` rows.

## Validation

- Repository tests verify the status and time predicates.
- Service tests verify update ordering and returned counts.
- Scheduler tests verify every run delegates once to the transactional service.
