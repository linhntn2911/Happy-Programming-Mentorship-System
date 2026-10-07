# Data model
users: first_name/last_name NVARCHAR(75) existing; full_name NVARCHAR(150), bio NVARCHAR(1000), experience_level BEGINNER/FRESHER/JUNIOR/MID/SENIOR, github_url/portfolio_url NVARCHAR(500), avatar_file_id FK files existing. New nullable learning_goals NVARCHAR(2000).
files: existing owner and metadata; new nullable avatar_content VARBINARY(MAX), used only by profile-avatar/<UUID> keys, PRIVATE, READY. Original image is not retained; normalized PNG max 2 MB. Updating clears the previous feature-owned avatar payload and marks it DELETED, preserving the metadata/FKs.
