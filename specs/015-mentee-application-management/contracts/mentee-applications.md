# Mentee Applications API

## List current mentee's monthly applications

`GET /api/mentorship-requests/mine?page=0&size=10&status=PENDING`

Authentication: required; the authenticated user must have the MENTEE role. The server derives the owner ID from the session.

Query parameters:
- `page`: zero-based page index, default `0`.
- `size`: page size from `1` to `50`, default `10`.
- `status`: optional exact application status: `PENDING`, `ACCEPTED`, `REJECTED`, `EXPIRED`, or `CANCELLED`.

Success response uses the standard `ApiResponse` envelope. `data` contains `applications`, `totalElements`, `totalPages`, `page`, and `size`. Each application contains request ID, mentor name, package name, learning-goal summary, request status, submitted/responded/deadline timestamps, funded timestamp, and latest payment status/expiry when available. No payment action URL is returned; clients derive eligibility from `status == ACCEPTED && fundedAt == null` and navigate through the existing checkout route.

Errors: `401` for unauthenticated users, `403` for users without the MENTEE role, and `400` for invalid pagination or status.
