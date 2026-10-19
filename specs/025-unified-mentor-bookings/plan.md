# Plan

- Reuse the existing mentor request table and details dialog as the unified Bookings view.
- Add `/api/mentors/me/bookings` while retaining `/api/mentors/me/requests` for compatibility.
- Extend the mentor list DTO with a derived lifecycle status, schedule, session count, and participant count.
- Resolve one-off booking state from persisted `bookings` rows linked by the immutable request identifier in `terms_snapshot`; fall back to the order snapshot while payment is pending.
- Keep decision authorization and mutations unchanged and limited to pending monthly requests.
- No database migration is required because the data already exists in requests, offer snapshots, and bookings.
