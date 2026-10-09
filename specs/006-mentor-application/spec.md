# Verified mentor application and Staff approval

One email identifies one account. Becoming a mentor preserves mentee access. Public mentor signup and signed-in mentee applications converge on the same review workflow. Preserve the existing English purple/white form.

## Acceptance
- Anonymous applicants check email first. Existing accounts must log in and return to apply; never overwrite an existing account through signup.
- Signed-in mentees apply with their account email without a new password.
- Persist profile details and the PDF CV as DRAFT before sending OTP.
- Application-bound, single-use OTP expires after 15 minutes; five guesses, server-enforced 60-second resend cooldown.
- Verified applications become PENDING. Refresh shows persisted status; duplicate pending submissions are rejected.
- Authorized Staff with MENTOR_APPLICATION_MANAGE permission or Admin reviews profile/CV. No self-review. Approval grants MENTOR and preserves MENTEE; rejection requires reason and permits editing/resubmission with fresh OTP.
- No mentor privilege from signup, OTP or Google OAuth alone. Mail failure must never display false delivery/submission success.

## Out of scope
Public profile publishing, individual skill verification, paid plans, automated decisions and login redesign.
