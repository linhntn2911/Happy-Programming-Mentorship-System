# Mentor wishlist

## Scope

Authenticated mentees can save public mentors, remove saved mentors, and review their saved list. Wishlist state is persisted in the existing SQL Server `dbo.wishlists` table.

## User outcomes

- A signed-in mentee can save or remove a mentor from the directory, homepage, or mentor profile.
- The saved state is restored from the server after refresh and across browsers for the same account.
- A signed-in mentee can open a Wishlist page showing saved mentors and links to their profiles.
- Guests receive an actionable sign-in message instead of a local-only save.
- Mentor ownership, public visibility, and mentee role checks are enforced by the backend.

## Out of scope

Wishlist sharing, notifications, recommendations, mentor-side management, and schema changes. The existing `dbo.wishlists` table is used as-is.

## Acceptance criteria

1. `GET /api/wishlists` returns only the authenticated mentee's public mentor slugs.
2. `PUT /api/wishlists/{mentorSlug}` is idempotent and saves only an existing public mentor.
3. `DELETE /api/wishlists/{mentorSlug}` is idempotent for the authenticated mentee.
4. Non-mentees and unauthenticated callers cannot mutate or read a wishlist.
5. The frontend shows loading, empty, error, saved, and removed states without writing wishlist data to browser storage.
