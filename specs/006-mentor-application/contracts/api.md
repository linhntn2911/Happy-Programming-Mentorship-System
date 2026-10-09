# API contract

ApiResponse JSON; CSRF on mutations. Errors: 400 invalid input/state/code, 401 login, 403 ownership/reviewer denied, 409 duplicate email/application, 503 mail failure.

- POST /api/mentor-applications/check-email {email}: {loginRequired}.
- POST /api/mentor-applications: MentorSignupRequest plus cvBase64. Creates/updates own DRAFT, sends OTP, returns summary. Anonymous new account is session-bound. Legacy /api/auth/signup/mentor uses same flow.
- GET /api/mentor-applications/mine: latest own summary or null, safe profile, status, reason, OTP times and CV filename.
- POST /api/mentor-applications/verify {code}: session owner only; returns PENDING summary, establishes session for verified applicant.
- POST /api/mentor-applications/resend: own DRAFT, enforce cooldown.
- GET /api/staff/mentor-applications: latest 100 pending summaries for authorized reviewer.
- POST /api/staff/mentor-applications/{id}/decision {decision: APPROVED|REJECTED, reason}: live permission check, PENDING only, no self-review.
- GET /api/staff/mentor-applications/{id}/cv: authorized reviewer, PDF attachment.
- Login additionally accepts STAFF/ADMIN for explicit Staff portal; /me includes roles. Selected active role must be owned.
