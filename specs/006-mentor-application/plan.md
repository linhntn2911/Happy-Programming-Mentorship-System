# Implementation plan

Repository policies supply constitution principles: layered Java, SQL Server, shared English UI, immutable init and server authorization. This revision corrects the earlier claim that generic signup already persisted and queued applications.

1. Add dated transactional repeat-safe migration: user_roles backfills existing roles; mentor_applications gains OTP metadata and PDF payload. Preserve baseline and data.
2. JPA repositories and MentorApplicationService own persistence and transactions. Lock user then application; serialize snapshot excluding password/CV bytes. Anonymous drafts are bound to browser session, never email alone.
3. Dedicated mentor OTP: BCrypt, SecureRandom, 15 minutes, five guesses, 60-second cooldown. Failed verification returns a result so counters commit. SMTP failure rolls back changes. Activate only newly created unverified accounts, never locked accounts.
4. Effective roles include legacy primary role plus DB assignments. Selected role must belong to user. Google cannot provision mentors. Staff decisions recheck live status/permission; approval and role grant are atomic.
5. Reuse onboarding form, add email gate, login return, existing identity, status/rejected editing, real PDF upload and minimal Staff review queue. Return URLs are allowlisted.
6. Focused SQL Server integration tests mock mail delivery only, frontend build and UI checks. The checked-in migration was applied successfully to the configured SQL Server. Live SMTP delivery remains an external deployment check.

## Analysis
Acceptance maps to tasks and contract; no init changes, no real-data deletion, no mock catalog. Private CVs require authorized review.
