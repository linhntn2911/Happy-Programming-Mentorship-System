# Tasks

- [x] Backend DTOs (`CreateReviewRequest`, `ReviewResponseDto`, `PublicReviewDto`).
- [x] Backend `ReviewRepository` for booking eligibility check, duplicate review check, review insertion, and public reviews query.
- [x] Update `MentorshipWorkspaceRepository` and `WorkspaceOneOffBookingDto` to return review fields (`reviewId`, `rating`, `reviewComment`).
- [x] Backend `ReviewService` with ownership check, completed status check, duplicate check, and mentor notification.
- [x] Backend `ReviewController` exposing `POST /api/reviews`, `GET /api/bookings/{id}/review`, and `GET /api/mentors/{identifier}/reviews`.
- [x] Backend unit & integration tests (`ReviewServiceTest`, `ReviewControllerTest`).
- [x] Frontend `frontend/src/roles/mentee/reviewService.js` with CSRF support.
- [x] Frontend `MentorshipWorkspacePage.js`: render review button for unreviewed completed sessions, render review pill for reviewed sessions, and add interactive review modal dialog.
- [x] Frontend `MentorProfilePage.js`: display published reviews in `#profile-reviews`.
- [x] Frontend unit tests for review service and workspace page review dialog.
- [x] Full verification: backend tests pass and frontend tests pass.

