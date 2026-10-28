# Feature Specification: Admin operational settings

Created: 2026-10-23. Branch: luong. Status: In progress.

## User Scenarios & Testing

### P1 — Control platform operations
An active administrator changes maintenance state and a public announcement with a reason. Reloading retains the values and audit records identify the change. Other roles cannot change them.

### P1 — Configure wallet policy
An administrator sets the minimum withdrawal and earnings hold. New withdrawal requests below the minimum are rejected. Existing paid transactions and ledger entries are never rewritten. Historical earnings retain their original hold; new verified payments use the configured hold.

### P2 — Configure OTP and withdrawal fees
Administrators configure OTP timing and withdrawal fee policy. Codes already issued retain their expiry; withdrawals already requested retain their fee.

## Requirements
- FR-001: Persist validated operational settings, restricted to active administrators, with a required change reason and before/after audit.
- FR-002: Maintenance denies non-admin business operations while allowing administrator recovery, authentication, logout, public status, and authenticated SePay callbacks.
- FR-003: Display a plain-text system-wide announcement; empty text hides it. Never interpret announcement HTML.
- FR-004: Withdrawal amount must be strictly greater than the configured threshold (at least 10,000 VND, default 10,000). Amounts are whole VND. Earnings hold is 1–90 full days, default 7. Existing earnings retain the previous schedule.
- FR-005: Settings failures must not be shown as saved; invalid requests must not partially update.
- FR-006: Configure both OTP resend cooldown (30–3600 seconds, default 60) and validity (1–30 minutes, default 10) for verification, reset, mentor application and payout codes. Already issued codes retain their expiry.
- FR-007: Fixed withdrawal fee in whole VND (0–10,000, default 0), deducted from the requested gross amount. Disclose fee and net bank transfer before confirmation; snapshot fee on creation. Reject stale confirmations when fee changes. Ledger debits the gross amount once.

## Edge cases
Disabled administrator; missing configuration; blank announcement; stored HTML payload; maintenance switched on during an active session; incoming webhook during maintenance; concurrent configuration writes; existing pending payouts; existing funded earnings.

## Key entities
Operational configuration; configuration audit; payment hold snapshot; withdrawal fee snapshot.

## Success Criteria
All configured changes survive reload. Unauthorized updates are rejected. Maintenance can be disabled by an active administrator. Announcement text is displayed safely. Wallet and OTP boundary cases must pass before completion.

## Clarifications
User confirmed both OTP timings and withdrawals strictly above 10K VND. Default fee remains zero; the fixed-fee configuration is separate from the withdrawal threshold. This request supersedes the fixed seven-day rule only for newly funded payments; historical payments retain seven days.
