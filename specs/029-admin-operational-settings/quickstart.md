# Validation and rollout
1. Back up the target local database and run the backend with its normal private DB environment variables; Flyway applies V22. Never commit local datasource credentials.
2. Open Admin > System settings. System operations must show OTP 60 seconds / 10 minutes, withdrawal threshold 10,000 VND, fee 0, hold 7 days, maintenance disabled, and no announcement.
3. Change settings with a reason; inspect the confirmation, save, reload and check OPERATIONS_SETTINGS_CHANGED in Audit logs. Invalid values and blank reasons must not save. Staff/mentor/guest cannot update.
4. Set an announcement containing angle brackets: all routes show literal text, never executable markup. Empty announcement hides it.
5. Enable maintenance: member business API calls return 503. Login/logout, public status and SePay webhook remain available; active Admin can turn maintenance off. A disabled Admin cannot bypass it. Webhook credential validation still applies.
6. OTP: configure 120 seconds / 3 minutes; repeat issuance before 120 seconds must be throttled; an issued code expires at 3 minutes even if the policy later changes. Forgotten-password responses remain neutral.
7. Payout: 10,000 VND is rejected; 10,001 VND is eligible subject to available balance and bank/OTP validation. For gross 20,000 and fee 1,000, confirmation and review show net 19,000. A changed fee requires a new review. Existing payout fee stays 1,000. Paying debits 20,000 once; rejecting releases the gross reservation.
8. Hold: a newly settled payment snapshots the selected hold. Changing settings afterward does not change that snapshot. Old payments retain seven days. Release and webhook replay remain idempotent.
9. Verify keyboard labels/focus and loading, error, disabled and success states. Reset maintenance/announcement only if they were test changes.

Automated checks: OperationalSettingsServiceTest, OperationalPolicyTest, MaintenanceConfigTest; SepaySettlementIntegrationTest includes hold snapshots and net payout/debit verification. Run the full backend suite against an isolated SQL Server test database and frontend node --test/build because this change crosses authentication, shared config and payments. No actual bank transfer or real email is needed.
