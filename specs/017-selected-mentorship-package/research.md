# Bug research

- The profile pricing control already embeds each tier's data but its Apply handler only navigated with mentor ID and name.
- The monthly application form submitted only `mentorSlug` and the backend selected the first active monthly offering ordered by display order. Thus the displayed tier selection never reached the request or immutable offer snapshot.
- Checkout reads the saved offer snapshot, so its displayed price reflects the wrong package selected during request creation.
- `service_offerings` already has a stable ID, `plan_tier`, and active status. No schema migration is needed; the create-request API can validate the selected ID against the mentor and current active monthly offerings.
- Previously submitted applications must keep their snapshots. Mentees need to cancel an unpaid stale application and submit again after this fix.
