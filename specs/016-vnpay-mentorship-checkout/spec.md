# VNPay Mentorship Checkout

## User outcome
An accepted, unpaid mentorship application opens a checkout with the accepted mentor, package terms, and exact price. The mentee can start a VNPay payment attempt and is redirected to the configured VNPay gateway. A verified server-to-server IPN is the only event that marks payment successful, places funds in escrow, and activates the mentorship subscription.

## Requirements
- Only the authenticated owning mentee may view checkout or initiate payment, and only while the request is `ACCEPTED` and not funded.
- Checkout details use the immutable application offer snapshot. For a legacy application with a missing snapshot only, the backend may reconstruct and persist one from the exact linked active monthly offering if its `updated_at` is not later than the application's submission time; changed, missing, or invalid package data must fail safely instead of guessing a price or bank account.
- Starting checkout creates/reuses a `PENDING` VNPay payment attempt with a 15-minute expiry and a commission snapshot from `finance.commission_rate`.
- Each attempt has a unique payment reference. The checkout displays it for reconciliation and sends it in both VNPay's transaction reference and order information; the VNPay hosted page displays the QR.
- The backend signs VNPay 2.1.0 requests with HMAC-SHA512 and sends the user to the configured gateway.
- IPN signature, merchant code, transaction reference, amount, currency, response code and transaction status are verified before a single atomic settlement.
- Settlement is idempotent and creates the payment success, escrow hold, funded timestamp, active subscription and conversation/workspace state only once. There is no free trial.
- Failed and expired attempts do not change the accepted application and can be retried with a new reference.
- Browser return never settles payment. It only returns the mentee to the checkout state page, which reads current server state.
- VNPay credentials are environment configuration only. No bank transfer or fake instant-success path is presented.
- Checkout shows mentor, package, monthly amount, learning goals, included sessions, expiry, and the pending/failed/paid state.
- A mentee can cancel an unpaid pending or accepted application when it has no open or successful payment, then submit a new application using the mentor's current package. Historical application and package records remain available.

## Acceptance scenarios
1. An accepted unpaid application displays its exact mentor/package/amount and can prepare a VNPay QR payment.
2. The mentee can copy the unique attempt reference before opening VNPay; retries after failure/expiry receive a new reference.
3. Initiation creates a pending attempt expiring in 15 minutes and returns a signed VNPay URL.
4. Invalid signature, wrong merchant, amount, currency, reference, or unsuccessful result never creates escrow or subscription records.
5. A valid success IPN performs settlement once; repeated IPNs return an idempotent success response without duplicate ledger/subscription rows.
6. A failed or expired attempt remains retryable while the application stays accepted and unfunded.
7. A VNPay browser return before IPN shows payment processing and does not activate mentorship.
8. Missing gateway credentials disable initiation with a clear service error while checkout details remain readable.
9. A legacy accepted request with no snapshot can be paid only when its exact linked monthly offering is still active and unchanged since submission; the reconstructed snapshot is persisted before payment creation. If the package changed, checkout shows that the price cannot be verified and payment stays disabled.

## Scope boundary
This change implements VNPay 2.1.0 redirect checkout, signed IPN processing, and browser return handling. Payment activates the subscription immediately after IPN verification; no free trial is offered. A working merchant account and publicly reachable HTTPS IPN URL are external setup requirements; do not claim a live transaction until the merchant provides credentials and configures the IPN URL in the VNPay merchant portal.
