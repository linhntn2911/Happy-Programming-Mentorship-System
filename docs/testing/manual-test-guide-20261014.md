# Browser Manual Test Guide — One-off Session and Mentor Wallet OTP

## Test setup

- Start the backend against a disposable local development database that has all current migrations applied, and start the frontend at `http://localhost:5173`.
- Apply `docs/database/migration/026_20261014_seed_dev_mentor_wallet.sql` to that development database once. It is idempotent and creates a clearly labeled synthetic receipt for `nt1414856@gmail.com`; it does not represent real transferred funds. The resulting available balance is approximately 5,000,000 VND after the seven-day release and 15% fee.
- Mentor login: `nt1414856@gmail.com`. Use the password already configured for that local account. No password is reset or created by this guide.
- To read the withdrawal OTP in a local terminal, start the backend with Spring profile `dev` and `HPMS_DEV_LOG_PAYOUT_OTP=true`. Find the warning line `DEV ONLY payout OTP for ...` in the backend terminal. Logging is disabled by default and the OTP is never returned by the API.
- One-off request setup: submit a request from a separate Mentee account through an active mentor profile that has an active `ONE_OFF` offering. If this account has no offering, create/activate one in Mentor workspace → Packages or use another seeded active mentor. Do not reuse an active request for the same mentee/mentor pair.

## One-off session — Mentor role

| Step | Browser action | Expected result / checklist |
|---|---|---|
| 1 | Sign in as the mentor and open **Mentor Workspace → Requests** (`http://localhost:5173/#/mentor/requests`). | Requests page loads. Each row/card shows a type badge. |
| 2 | Locate a request created from an individual session. | The badge says **One-off session**, visually distinct from the **Monthly** badge. |
| 3 | Open the pending request and choose **Accept request**. | The request becomes **Accepted**. A status message says: “Session request accepted. The mentee has been notified to arrange the session.” The mentee is notified to arrange the session directly; acceptance does not trigger monthly checkout. |
| 4 | Submit a second one-off request from a Mentee account (same mentor, if no other pending/accepted one-off request exists), then return to Requests and choose **Reject request**. | The request status becomes **Rejected**. The message says it remains available in request history. |
| 5 | Filter Requests by **Rejected** or **All requests**. | The rejected request remains visible with a **Rejected** status badge. |

## Wallet and payout OTP — Mentor role

| Step | Browser action | Expected result / checklist |
|---|---|---|
| 1 | Sign in as `nt1414856@gmail.com`; open **Mentor Workspace → Wallet** (`http://localhost:5173/#/mentor/wallet`). | Wallet page loads with held, available, reserved, and paid-out balances. Available is about **5,000,000 VND** after seed release; exact amount may vary by rounding. |
| 2 | Inspect **Bank account**. If none is saved, enter bank name, account holder, and a test account number, then select **Save bank account**. | Saved-account view masks the number and displays its last four digits as `···· 1234` (or the final four digits entered). The full number is not shown again. |
| 3 | In **Request a payout**, enter an amount at or below the available balance and select **Continue**. | A six-digit verification dialog opens after the OTP request succeeds. It names the masked email and amount/destination. |
| 4 | In the backend terminal, copy the OTP from the `DEV ONLY payout OTP for ...` warning line. | The line is available only when both the `dev` profile and `HPMS_DEV_LOG_PAYOUT_OTP=true` are set. OTP expires after 10 minutes. Otherwise, use the email delivered to the mentor account. |
| 5 | Enter an incorrect six-digit code and select **Confirm withdrawal**. | The dialog shows **Invalid or expired verification code.** No payout request is created and no balance is reserved. |
| 6 | Enter the current correct six-digit OTP and confirm. | A success toast says **Payout request submitted. Funds are now reserved.** The dialog closes. |
| 7 | Inspect **Payout requests** history and the balance cards. | A new row appears with status **REQUESTED**; reserved balance increases by the request amount and available balance decreases accordingly. Admin review is still required before payment. |

## Notes

- The OTP is sent by email in normal operation. Terminal logging is a local development aid and must remain disabled outside the `dev` profile.
- This guide does not include Admin marking a payout `PAID`; that would claim an external bank transfer was completed.
- The seed SQL must not be applied to production. It refuses databases whose names do not contain `Dev`, `Test`, or `Local`.
