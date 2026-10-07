# Data model

users keeps primary identity and legacy role_code. New applicants are INACTIVE MENTEE until verified. Existing users keep identity/status.

user_roles uses (user_id, role_code) primary key. Effective roles include legacy role; approved mentors retain MENTEE.

mentor_applications keeps biography, years_experience, professional_background and JSON profile_snapshot. Add otp_hash, otp_expires_at, otp_sent_at, otp_attempts, cv_file_name, cv_content. UTC timestamps; private PDF <=10 MiB. Snapshot excludes password/binary. Existing unique pending index and user-row locks prevent duplicates. Edits invalidate OTP. Decisions stamp reviewer/time/reason.

Existing user_permissions grants STAFF review entitlement. ADMIN can review. Self-review forbidden.
