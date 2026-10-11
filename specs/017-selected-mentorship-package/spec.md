# Selected mentorship package must match the application

## Observed behavior
The mentor profile shows the selected Lite tier at 1,200,000 VND, but a new application can be saved against a different active monthly package. The checkout then correctly reads the application snapshot and displays that other package's price and terms.

## User outcome
The package selected on a mentor's profile is the package attached to the application and later checkout.

## Requirements
- The selected published package's service offering ID is carried from the profile tier control through the application form to the create-request API.
- The backend accepts only an active monthly offering owned by the requested mentor and snapshots that offering's name/tier, price, currency, call count, duration, and trial configuration.
- If the offering is no longer active or no longer belongs to the mentor, reject submission and ask the mentee to refresh the profile.
- If a mentor has multiple active packages and a client omits the selected offering ID, reject the ambiguous request instead of choosing the first package.
- Existing application snapshots remain immutable; correcting a new submission must not rewrite a previously accepted application's terms.
- A profile with no active package must not present fabricated package choices.

## Acceptance scenarios
1. Selecting Lite submits Lite's offering ID; the application snapshot and checkout show Lite's server-side amount and terms.
2. Switching from Lite to Standard changes the submitted offering ID to Standard.
3. A stale or foreign offering ID is rejected without creating a request.
4. A request without an offering ID is accepted only when the mentor has exactly one active monthly package.
5. A mentor with no active monthly packages displays an empty package state and cannot create a request from placeholder pricing.
