# Operational configuration contract
GET /api/admin/operations: active Admin only; ApiResponse data is OperationalSettings.
PUT /api/admin/operations: active Admin + CSRF; { settings: OperationalSettings, reason: nonblank max 1000 }. Atomic update and audit. 400 invalid; 401 unauthenticated; 403 unauthorized; 500 persistence failure.
GET /api/public/operations: public; OperationalSettings. No secret values.

OperationalSettings required fields: maintenance boolean; announcement plain text max 2000; otpResendSeconds integer 30–3600; otpExpiryMinutes integer 1–30; withdrawalThreshold whole VND 10,000–999,999,999 exclusive; withdrawalFee whole VND 0–10,000; earningsHoldDays integer 1–90.
Payout OTP response additionally exposes feeAmount and netAmount. Submit accepts expectedFee; omission is compatible only when the current fee is zero, otherwise 409 requires a fresh quote. Payout responses add feeAmount and netAmount. Existing amount remains the gross reserved/debited amount. Legacy payout creation must also confirm any nonzero fee.
OTP cooldown violations return 429; forgotten-password requests keep the neutral response during cooldown to prevent account enumeration. All existing issued-token expiry timestamps remain authoritative.
During maintenance, blocked API calls return 503 with ApiResponse error and Retry-After: 60. Auth recovery and verified payment webhook remain accessible.
