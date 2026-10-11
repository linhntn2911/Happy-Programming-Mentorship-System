# Research: VNPay Mentorship Checkout

## Current implementation findings
- Existing `GET /api/mentorship-requests/{id}/checkout-info` selected `professional_title` and `avatar_url`, which are absent from the canonical mentor-profile table. `MentorApiExceptionHandler` converted the resulting SQL error into the screenshot's generic "Mentor data is temporarily unavailable" response. The schema provides `job_title`; no mentor avatar column exists in this profile table.
- Checkout details also included hardcoded MB Bank transfer data.
- Existing `POST /api/mentorship-requests/{id}/checkout` trusts the browser and immediately records payment `SUCCEEDED`, escrow HOLD, funded request and trial subscription. This violates the canonical state machine.
- The baseline SQL schema already has payment attempts, expiry, gateway reference/transaction ID, payment events, escrow ledger idempotency, subscription trial fields, and `finance.commission_rate`; no schema change is required.
- The checked-in frontend checkout offers mock bank transfer and displays instant success. These paths must be replaced with a real pending redirect and server-refreshed result state.

## Protocol decisions
- VNPay v2.1.0: sorted `vnp_` fields, URL-encoded key/value pairs, HMAC-SHA512 `vnp_SecureHash`; omit `vnp_SecureHashType`.
- Submit `vnp_Amount` as VND multiplied by 100 and include `vnp_ExpireDate`.
- IPN response uses JSON `{RspCode, Message}`. Validate signature and order amount/reference before database mutation.
- VNPay's public merchant integration documentation states that the merchant server must be reachable from the internet for IPN. A local-only project can generate sandbox requests, but cannot prove IPN settlement without an exposed callback and merchant credentials.
