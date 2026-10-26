# Consistency review
- User clarification covers both OTP timers and an exclusive 10K threshold; fee is a separate fixed-VND control, default zero.
- Existing seven-day specification is explicitly amended for future payment snapshots only.
- Controller and service authorization plus CSRF protect updates; public API exposes only nonsecret operational values.
- Configuration schema uses the baseline JSON envelope and versioned migrations.
- Gross reservation/debit, fee snapshot and net transfer are distinct in API/UI; no duplicate external transfer is initiated by the application.
- Requirements map to ordered tasks, contracts and quickstart acceptance cases. Runtime tests must pass before completion.
