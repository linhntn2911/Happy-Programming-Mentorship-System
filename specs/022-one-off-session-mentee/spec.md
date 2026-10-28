# Mentee one-off session discovery

## User outcome

A Mentee can inspect a mentor's real active one-off session offerings without seeing fabricated pricing, availability, reviews, discounts, participant counts, or capacity claims.

## Requirements

- The public offering API returns only active offerings belonging to a public, active Mentor.
- The mentor profile always exposes the one-off entry point so users can reach the sessions area; mentors without active `ONE_OFF` offerings receive an honest empty state.
- The session list shows the offering name, description, duration, price, and link to details.
- The detail view shows the selected offering, mentor context, agenda input, and real aggregate rating when available.
- Until Mentor availability management and its API are implemented, the detail view displays an explicit empty availability state and does not create fake slots or allow checkout.
- The flow excludes MentorCruise-only concepts not supported by HappyProgramming: discount codes, participant quantity, remaining-spots claims, dynamic FAQ content, protection pledges, and testimonial cards without verified review data.

## Acceptance scenarios

1. A mentor with active one-off offerings shows a session entry point and pages populated from the backend.
2. A mentor without active one-off offerings keeps the one-off CTA available and shows an honest empty state on the sessions route without a fabricated price.
3. A stale offering ID shows an unavailable state and links back to active offerings.
4. The booking action remains disabled while no published availability API exists.
