# Quickstart: Automatic Monthly Subscription Lifecycle

1. Create a `TRIALING` subscription whose trial has elapsed but whose `current_period_end` is still in the future.
2. Run the lifecycle job and verify its status becomes `ACTIVE`.
3. Create an `ACTIVE` subscription whose `current_period_end` has elapsed.
4. Run the lifecycle job and verify its status becomes `ENDED` while the row and financial references remain.
5. Run the job again and verify neither row changes again.
6. Verify a `DISPUTED` subscription remains unchanged.
