# Mentor request history API

`GET /api/mentors/me/requests`

- Requires an authenticated active mentor.
- Returns the mentor's persisted mentorship request records, ordered newest first.
- Each record includes request ID, mentee name, package name, learning goals, current status, submission time, and response deadline.
- This is a read-only history endpoint; decisions update the existing row through `PUT /api/mentors/me/requests/{requestId}/decision`.
