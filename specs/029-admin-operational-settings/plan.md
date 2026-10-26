# Plan

Keep existing commission/support settings API compatible. Add a separate operational configuration endpoint backed by system_configs, with service-owned transaction and AdminRepository audit. All writes require current AdminService.requireAdmin and CSRF.

Use a Spring MVC interceptor after authentication for maintenance enforcement; explicitly allow auth recovery and SePay webhook. Recheck admin status from storage. Public operational status has no credentials. A shared frontend banner uses textContent and polls status without exposing private settings. Admin settings reuse admin-panel/admin-field/button styles.

Versioned migration adds the operational JSON config, without changing the baseline. The same versioned migration adds payment hold and payout fee snapshots. system_configs JSON uses the canonical {value: object} envelope required by its trigger. Existing rows receive hold=7 and fee=0; new verified payments snapshot the current hold at webhook settlement. New payouts snapshot the confirmed fee; amount means gross wallet debit, netAmount is external transfer. UTC timestamps; elapsed OTP time uses injected Clock.

Verification: focused service/interceptor/render tests, then both full suites because authentication, shared frontend and payments are affected. No real bank transfers. Existing local uncommitted test work is preserved and adapted to new upstream constructor contracts.
