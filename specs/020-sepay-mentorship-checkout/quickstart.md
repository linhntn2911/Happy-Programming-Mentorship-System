# Quickstart: SePay Mentorship Checkout

## Configuration
Configure environment or `application.properties`:
```properties
hpms.sepay.enabled=true
hpms.sepay.bank-name=TPBank
hpms.sepay.account-number=00000806194
hpms.sepay.account-holder=NGUYEN THI NGOC LINH
hpms.sepay.api-key=${SEPAY_API_KEY}
```

## Mentee Manual Test Path
1. Log in as a mentee.
2. Open an accepted application under `/#/applications`.
3. Click "Pay" to navigate to `/#/checkout?requestId=<id>`.
4. Click "Prepare QR Payment":
   - The SePay VietQR code appears directly on the page.
   - The bank information (TPBank, 00000806194, NGUYEN THI NGOC LINH, amount, transfer code) is clearly shown.
   - Click "Copy" on account number and transfer code to test copy functionality.
5. In development / testing, simulate SePay webhook by sending a POST request to:
   `https://council-tribute-uses-ftp.trycloudflare.com/api/payments/sepay/webhook` (or `http://localhost:8080/api/payments/sepay/webhook`)
   with header `Authorization: Apikey <your private SEPAY_API_KEY>`
   and payload containing matching `code` and `transferAmount`.
6. Watch the checkout page automatically detect settlement within 3 seconds and switch to "Your mentorship is active".

## Repair verification, 2026-10-12
- Full backend suite on isolated HPMS_SePay_Test_20261012 at V13: 150 discovered, 145 passed, 5 existing opt-in tests skipped. After adding two further cases, all 8 SepaySettlementIntegrationTest cases passed in a targeted rerun with real Spring security filters and SQL Server.
- Frontend: 55 tests passed; production build passed. Gross commission rounds consistently per payment in totals, rows and CSV and is labelled estimated before refunds/settlement.
- Covered: successful settlement/escrow/subscription, repeated and simultaneous callbacks, provider ID reuse on another order, amount mismatch, expired/cancelled/other-provider attempts, missing HTTP key/payload, before-seven-day hold, idempotent release, pending refund blocking release, completed partial refund reconciliation, payout reservation and depletion after PAID, rejection of a second withdrawal.
- Refund arithmetic fixture: 1,000,000 gross minus 200,000 completed refund = 680,000 mentor release + 120,000 platform fee at 15%. This is synthetic SQL evidence, not a bank transfer.
- The concurrency test is explicitly opt-in with HPMS_PAYMENT_CONCURRENCY=true and asserts a HPMS_SePay_Test_ database prefix before committing its isolated fixtures. Other financial fixtures roll back automatically. No real provider HTTP requests or money movements occurred.
- Original HappyProgramming database remains V7. The disposable database copy was migrated through V13 successfully. Application tests must point DB_URL to the dedicated migrated database; do not claim the original V7 local application supports the new wallet schema.
- A private SEPAY_API_KEY must be supplied externally for real checkout/webhook use; a previously committed key must be rotated by its owner if used in a real SePay configuration. No remote dashboard changes were made.
- Convergence: review repair tasks complete for code and isolated database validation. No production migration or provider end-to-end bank validation claimed. Original review remains a historical record, superseded by these fixes and test results. No implementation hooks were present in .specify/extensions.yml.

## Mentor HTTP walkthrough, 2026-10-12
Opt-in migration 021 created mentor.review@example.test only in HPMS_SePay_Test_20261012, with a synthetic historical 1,000,000 VND receipt at 15%. Live login, profile, dashboard, requests, plans and wallet returned HTTP 200. Wallet released 850,000 VND; requesting 850,001 was denied with 409. A synthetic 100,000 VND payout request was left REQUESTED for user review: available 750,000, reserved 100,000. Admin could see the request; Mentor could not access the Admin payout endpoint (403). Both verification sessions logged out. No real transfer or PAID decision occurred. Credentials remain in ignored .system_generated/mentor-review-credentials.txt. Initial fixture tier BASIC was rejected and rolled back; corrected STANDARD seed succeeded. This verifies API behavior, not a complete browser walkthrough or mentor decision/package editing flow.
