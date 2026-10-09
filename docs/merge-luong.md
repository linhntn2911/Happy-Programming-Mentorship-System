# Luong integration

Preserve local StaffPortal routes and migration 007 before merging origin/luong. Login conflict resolved by directing ADMIN to /admin and STAFF to /staff/dashboard. Existing mentee, mentor, profile and wishlist flows remain. Preserve the current init baseline; do not execute any seed or password reset during this merge.

## Migration order

Keep 001 through 007 unchanged. Append 008_20261006_admin_audit_integrity.sql (audit IP column/immutable audit trigger), then 009_20261007_provision_local_demo_admin.sql (optional development-only provisioning; depends on user_roles from 004 and audit IP from 008). Sequence numbers determine order, not dates. 005, 006, 007 and 009 are development data scripts and require deliberate execution; 009 deliberately rejects an existing account. Do not blindly rerun them on an existing database.

Five duplicated SQL files under backend resources are removed. Maven process-resources copies the canonical docs scripts into target/classes/db/migration using the original Flyway names V2 through V6. This retains existing Flyway histories/checksums, avoids duplicate source SQL, and excludes seed/password scripts from automatic startup. Build through Maven before an IDE launch. Manual docs order and existing Flyway version order differ intentionally for backward compatibility.

The SQL removed from backend resources is recoverable from origin/luong and is retained in docs/database/migration. No feature code is deleted.

Verification results will be recorded after checks.
