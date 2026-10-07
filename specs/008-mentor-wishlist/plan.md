# Plan: mentor wishlist

## Architecture

- Add a JPA entity and repository for the existing composite-key `dbo.wishlists` table.
- Resolve a public mentor by its database slug in the repository layer.
- Add a service that enforces an authenticated active mentee and idempotent save/remove behavior.
- Expose `/api/wishlists` controller endpoints with DTO responses.
- Replace frontend localStorage wishlist state with the wishlist service and add a Wishlist page.

## Data and security

No schema migration is needed because `dbo.wishlists` already exists in the immutable 31-table baseline. A temporary development seed migration provides public mentor profiles for the current prototype and must be removed when real mentor onboarding supplies them. Every query is scoped by the authenticated mentee ID; the mentor must be public and the account must have the `MENTEE` role.

## Validation

- Backend tests cover ownership, role checks, public mentor lookup, and idempotent mutations.
- Frontend production build verifies the service, page, and button wiring.
- Manual browser verification covers save, remove, refresh persistence, empty state, and sign-in messaging.
