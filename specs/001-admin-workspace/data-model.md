# Data model

Reuse dbo.users, dbo.user_permissions, dbo.system_configs, dbo.payments and dbo.audit_logs from the canonical 31-table schema. User rows expose only administration fields, not hashes/security counters or tokens. Permission allowlist: MENTOR_APPLICATION_MANAGE, MENTEE_MANAGE, MENTORSHIP_REQUEST_MANAGE, SKILL_MANAGE. Editing permissions does not change user roles.

Flyway V2 adds nullable varchar(45) ip_address to audit_logs and an UPDATE/DELETE rejection trigger. Existing entries retain null IP, displayed as unavailable. Audit actor, target, reason, old/new JSON and UTC timestamp are append-only. Migration baseline version 1 means the existing schema must already be provisioned.

Configuration scope: finance.commission_rate and platform.support_email. Values retain the canonical {"value": ...} JSON object shape. Commission rates use decimal percentages. Report gross and commission independently; it is not an escrow balance or net-of-refund settlement report.

Demo uses the same DTO shapes with example.com identities, synthetic payment references and a versioned localStorage namespace. Demo audit and security are simulations, never production authorization.
