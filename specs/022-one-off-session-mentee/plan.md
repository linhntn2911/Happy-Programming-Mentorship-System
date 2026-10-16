# Plan

- Reuse the service-offering DTO and add a public endpoint that returns all active offerings while preserving the existing monthly-only plans endpoint.
- Split monthly and one-off offerings in the public mentor profile.
- Add Mentee-owned one-off list and detail routes using the existing public layout and design tokens.
- Reuse the existing mentor availability and slot-hold APIs; generate offering-specific candidate slots every 10 minutes and exclude overlapping active holds.
- Create the slot hold before the one-off order and mark the order `ACCEPTED` immediately so no mentor decision is required.
- Apply migration `028_20261015_enable_instant_one_off_checkout.sql` so only one-off orders may start payment-eligible without a response deadline; monthly requests retain the 48-hour approval trigger.
- Include the hold, selected time, quantities, unit price, and calculated total in the immutable order snapshot.
- Reuse SePay checkout for the immediately payable order. Resolve one-off checkout from `totalPrice`, while monthly checkout continues to use `price`.
- Branch verified webhook settlement by service type: monthly creates a subscription; one-off converts the hold and creates `CONFIRMED` booking rows.
- Keep payment settlement and booking confirmation server-side; the browser cannot mark a slot confirmed.
- Verify the controller contract, rendered states, frontend tests, and production build.
