# Instant one-off session booking

## User outcome

A Mentee can choose a mentor's published one-off session, select a real available time, configure the number of sessions and participants, and proceed directly to SePay checkout without waiting for mentor approval.

## Requirements

- The public offering API returns only active offerings belonging to a public, active Mentor.
- The mentor profile always exposes the one-off entry point so users can reach the sessions area; mentors without active `ONE_OFF` offerings receive an honest empty state.
- The mentor profile opens all published one-off offerings in an in-page dialog; the former standalone session-list page is not part of the Mentee flow.
- The detail view shows the selected offering, mentor context, agenda input, and real aggregate rating when available.
- The checkout summary lets the Mentee choose 1–10 sessions and 1–10 participants.
- The displayed total equals the price per session multiplied by both the number of sessions and the number of participants.
- Public availability windows can be queried for a selected one-off offering; the backend generates candidate starts every 10 minutes and removes candidates that overlap active holds.
- A generated slot must fit fully inside a published availability window and the offering duration must be at least 10 minutes.
- Submitting the booking must atomically validate ownership, the active offering, the selected time, quantity limits, and an unexpired slot hold.
- A valid one-off order is immediately payment-eligible. It does not enter mentor review and does not have a 48-hour response deadline.
- The client redirects directly to SePay checkout after the slot hold and order are created.
- The one-off checkout amount comes from the immutable snapshot total: `unit price × sessions × participants`.
- The browser cannot mark payment or a booking successful. Only a verified SePay webhook may convert the held time into confirmed one-off booking records.
- If the selected time is no longer available, the order is not created and the Mentee must choose another slot.
- The flow excludes MentorCruise-only concepts not supported by HappyProgramming: discount codes, remaining-spots claims, dynamic FAQ content, protection pledges, and testimonial cards without verified review data.

## Acceptance scenarios

1. A mentor with active one-off offerings shows a session entry point and pages populated from the backend.
2. A mentor without active one-off offerings keeps the one-off CTA available and shows an honest empty state on the sessions route without a fabricated price.
3. A stale offering ID shows an unavailable state and links back to active offerings.
4. A selected offering returns only real generated slots that fit the mentor availability and do not overlap active holds.
5. Changing either session quantity or participant quantity updates the checkout total using `unit price × sessions × participants`.
6. Selecting "View all sessions" on the detail page opens the offerings dialog without navigating to a standalone list page.
7. Submitting a valid selected slot creates a payment-eligible one-off order and opens checkout immediately without mentor acceptance.
8. A verified exact SePay payment converts the hold and creates confirmed booking records; duplicate webhooks do not create duplicate bookings.
9. An overlapping or expired hold prevents order creation or settlement.
