# Quickstart: Mentor Wallet and Payouts

1. Configure VNPay merchant credentials and public IPN endpoint as described in `docs/payments/vnpay-setup.md`.
2. Generate a 32-byte wallet encryption key in PowerShell: `$rng = [Security.Cryptography.RandomNumberGenerator]::Create(); $bytes = New-Object byte[] 32; $rng.GetBytes($bytes); [Convert]::ToBase64String($bytes)`.
3. Set it only in the backend environment as `HPMS_WALLET_ENCRYPTION_KEY`; retain a secure backup.
4. Leave `WALLET_RELEASE_ENABLED=true` so the scheduled release scans run. Start the backend. Flyway applies migration `V13__add_mentor_wallet_payouts`.
5. Complete a sandbox payment. Confirm it appears as held in the mentor wallet and remains unavailable for seven days.
6. In an isolated test database, age a verified payment beyond seven days and run the release job; confirm the immutable ledger contains one mentor share and platform fee.
7. Request a payout as the mentor. Confirm it is reserved. As admin, make a manual transfer and record its bank reference, or reject it with a reason.
8. Confirm repeat admin decisions fail and cannot debit the wallet twice.

Do not run timing/backdating scenarios against production transactions. The app records transfers but does not execute them.
