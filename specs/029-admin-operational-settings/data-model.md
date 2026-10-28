# Data model
- system_configs key platform.operations: value_type JSON, config_value {"value": OperationalSettings}. Uses the existing validation trigger, updated_by/updated_at and audit service.
- payments.earnings_hold_days: NOT NULL INT, 1–90, historical/default 7. New SePay settlement snapshots the configured hold. Release compares paid_at to this immutable schedule; configuration changes do not rewrite previous payments.
- mentor_payout_requests.fee_amount: NOT NULL DECIMAL(18,0), historical/default 0, 0 <= fee < amount. amount remains gross reservation/debit; net bank transfer = amount - fee_amount. Fee changes cannot alter pending/paid requests.
- Existing OTP expiry timestamps are retained; no rewrite. New codes use configured minutes, and resend eligibility compares the latest issuance timestamp (including used codes) with configured seconds.
- Migrations: 031_20261023_add_operational_settings.sql, packaged as Flyway V22. Baseline remains untouched. All timestamps follow existing UTC storage.
