# Mentee Session Review

## Goal

Allow mentees to review their mentor after a session is completed. Mentees rate the session from 1 to 5 stars and submit feedback (10 to 500 characters). Each booking is eligible for exactly one review.

## Requirements

- **Authentication & Ownership**: Only authenticated mentees who own the booking (`mentee_id == currentUserId`) can submit a review.
- **Session Completion**: A session can only be reviewed once it has completed (`status = 'COMPLETED'` or `status = 'CONFIRMED'` with `end_at <= now`). Upcoming, unpaid, or cancelled sessions cannot be reviewed.
- **Single Review Constraint**: Each booking may only be reviewed once. Subsequent submissions for the same booking are rejected (`409 Conflict`), enforced both by pre-insert validation and the unique database constraint `UX_reviews_booking`.
- **Rating & Comment Validation**: Rating must be an integer from 1 to 5 stars. Comment must be trimmed and contain between 10 and 500 characters (`CK_reviews_rating` and `CK_reviews_comment`).
- **Persistence & Visibility**: Reviews are stored in `dbo.reviews` with `visibility_status = 'PUBLISHED'`, linking to `booking_id`.
- **Mentor Notification**: Submitting a review triggers an in-app notification to the mentor (`REVIEW_RECEIVED`).
- **Workspace Integration**: Inside `MentorshipWorkspacePage`, completed sessions display a "★ Review mentor" button if unreviewed. Once reviewed, the card displays the rating and comment snippet, and the review action is disabled.
- **Mentor Profile Display**: Published reviews are accessible via public API and rendered under the mentor's profile reviews section.

## Acceptance Scenarios

1. A mentee opens their mentorship workspace; completed one-off sessions that have not yet been reviewed display a "★ Review mentor" button.
2. Clicking "★ Review mentor" displays a review modal with star selection (1–5) and feedback textarea (10–500 characters).
3. Submitting the review saves the record, creates a mentor notification, and updates the session card to display the submitted rating.
4. Attempting to review the same booking a second time returns a `409 Conflict` error.
5. Attempting to review an ongoing or future session returns a `400 Bad Request` error.
6. A user attempting to review another user's booking receives a `403 Forbidden` error.
