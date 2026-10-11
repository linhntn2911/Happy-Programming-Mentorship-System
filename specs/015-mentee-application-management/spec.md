# Mentee Application Management

## User outcome
Mentees can open one page to review every monthly mentorship application and its current state. An accepted, unpaid application provides the payment action from this page. Pending, rejected, expired, cancelled, and paid applications clearly explain their state and do not offer an invalid payment action.

## Requirements
- The page is available only to a signed-in mentee and lists only applications owned by that mentee.
- Show mentor, package, submitted date, learning-goal summary, application status, and payment state independently.
- Support status filtering and pagination.
- Permit checkout navigation only for an owned request in `ACCEPTED` state with no `funded_at` timestamp.
- Notification links for submitted, accepted, and rejected monthly requests lead to this page, including existing notifications created before this change. The notification history remains an update feed, not the place users must return to in order to pay.
- After payment is verified, show the request as paid and remove its payment action.
- Do not include deployment or hosting URLs in email copy.

## Acceptance scenarios
1. A mentee with no requests sees a useful empty state and a link to browse mentors.
2. A mentee sees only their own requests; another user's ID cannot expose a request in the list.
3. Pending, rejected, expired, and cancelled items never show a payment action.
4. Accepted and unpaid items open the existing checkout for the matching request ID.
5. An accepted item with `funded_at` is displayed as paid and cannot be paid again.
6. Status filters and page controls update the visible result set and preserve clear loading/error states.

## Scope boundary
This feature adds the mentee application list and fixes notification navigation. It reuses the existing checkout entry point. A production VNPay gateway integration is outside this feature because the current repository has no VNPay adapter or credentials; checkout remains subject to the payment implementation and must not be treated as a verified gateway payment unless that path is implemented separately.
