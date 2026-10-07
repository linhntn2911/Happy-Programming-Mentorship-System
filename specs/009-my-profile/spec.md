# Mentee My profile
Mentees can view and edit their own profile independently of mentor approval.
Fields: first/last name, bio, experience level, learning goals, GitHub and portfolio HTTPS links. Email is read-only. Optional avatar supports JPEG/PNG up to 2 MB, 2048 x 2048 pixels.
Existing accounts without optional information show empty fields and an initials avatar. Saving persists to SQL Server and survives reload. Cancel restores the last saved values. Successful name changes appear in the account menu. An active MENTEE role is required, including accounts with both roles.
Unauthorized access never returns another user's data. Invalid values do not modify stored data. Upload failures preserve the previous avatar. Loading, saving, error, retry and success states are visible; English desktop UI reuses existing components and tokens.
Out of scope: email/password changes, mentor public profiles, payments, mobile-specific work.

Experience levels include Beginner, Fresher, Junior, Mid-level and Senior. Fresher must persist after reload.
