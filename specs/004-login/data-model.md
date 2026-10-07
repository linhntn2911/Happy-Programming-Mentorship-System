# Existing database mappings

Read dbo.users identity/profile/status/password fields; update failed_login_count, locked_until, last_login_at and updated_at only. UTC timestamps. Raw BCrypt or {bcrypt} prefixed hashes; reject plaintext and unsupported encodings.

Read dbo.auth_identities for provider GOOGLE and provider_subject. Update last_used_at after successful authentication. No registration/linking, schema modification, migration or seed.

Sessions live in server memory for 30 minutes and expire on restart. Shared multi-instance session storage is outside this change.
