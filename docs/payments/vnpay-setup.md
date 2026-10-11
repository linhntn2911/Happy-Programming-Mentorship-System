# VNPay checkout setup

The checkout is disabled until a VNPay merchant account is configured. Set these backend environment variables from the values VNPay issues to the merchant; never commit the values:

| Variable | Purpose | Local default |
| --- | --- | --- |
| `VNPAY_ENABLED` | Enables payment initiation after credentials are present | `false` |
| `VNPAY_TMN_CODE` | Merchant website code | empty |
| `VNPAY_HASH_SECRET` | HMAC-SHA512 signing key | empty |
| `VNPAY_PAYMENT_URL` | Gateway URL | VNPay sandbox URL |
| `VNPAY_RETURN_URL` | Backend browser-return endpoint given to VNPay | `http://localhost:8080/api/payments/vnpay/return` |
| `VNPAY_FRONTEND_CHECKOUT_URL` | Frontend route to return the mentee to | `http://localhost:5173/#/checkout` |
| `PAYMENT_EXPIRY_ENABLED` | Runs the pending-attempt expiry job every minute | `false` |
| `WALLET_RELEASE_ENABLED` | Scans for verified payments that have completed the seven-day hold | `true` |

The merchant portal must separately configure the IPN URL to `https://<public-host>/api/payments/vnpay/ipn`. The browser return works locally, but a VNPay server cannot send IPN to a developer's private localhost. Use a public HTTPS tunnel for sandbox integration testing or a deployed HTTPS backend. Until a valid IPN arrives, the application remains accepted and the payment remains pending; the browser return alone never activates the subscription. Set `PAYMENT_EXPIRY_ENABLED=true` in the backend environment to expire incomplete attempts automatically; the default is off to avoid background writes against an unconfigured development database.

The integration uses VNPay API 2.1.0, VND amount multiplied by 100, and HMAC-SHA512. Checkout creates a 15-minute pending payment attempt and retries use a new reference after a failed or expired attempt. A verified IPN activates the paid mentorship immediately; there is no free trial.

## Mentor wallet and manual payouts

Verified payments remain in the platform escrow ledger for seven full days after the VNPay payment timestamp. A scheduled backend job then posts the mentor's net share and the platform commission using the payment's saved commission rate. Mentors can request withdrawal only against released, unreserved balance. An administrator must complete the bank transfer outside the application and record its reference before the wallet balance is debited; rejected requests release the reservation. The application does not initiate bank transfers.

Set `HPMS_WALLET_ENCRYPTION_KEY` to a base64-encoded 32-byte random key before enabling payout requests. Keep it in the backend's secret environment configuration and back it up securely; losing it makes stored payout account numbers unreadable. Generate one in Windows PowerShell with `$rng = [Security.Cryptography.RandomNumberGenerator]::Create(); $bytes = New-Object byte[] 32; $rng.GetBytes($bytes); [Convert]::ToBase64String($bytes)`. Only the final four account digits are shown to the mentor; full account details are exposed only to authenticated administrators with access to pending payouts.

The seven-day application hold is an internal accounting control, not a bank escrow or VNPay hold. Confirm with VNPay and the appropriate financial/legal advisers that the merchant agreement and business setup permit collecting mentee payments and paying mentors later. Refund/dispute handling must be coordinated with releases before production payouts are enabled.

Each payment reference is shown in the mentee checkout and sent to VNPay as `vnp_TxnRef` and embedded in alphanumeric order information (`HPMS<reference>`). Requests select `vnp_BankCode=VNPAYQR`, so VNPay opens its QR payment flow. Configure the merchant's settlement bank account in the VNPay merchant portal; do not put a personal receiving account or bank credentials in frontend source. The app cannot show the VNPay QR or create a signed attempt until the merchant credentials are configured.
