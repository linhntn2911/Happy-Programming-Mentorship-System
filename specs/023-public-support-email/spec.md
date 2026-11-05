# Public support email

## User outcome

Users can contact the platform through the support email configured by Admin without HappyProgramming implementing a ticket system or hardcoding an address in the client.

## Requirements

- A public read-only endpoint exposes only the configured support email.
- Commission and other system configuration remain private.
- The Footer shows `Contact support` as a `mailto:` link when a valid email is configured.
- Booking-related empty states may reuse the same link.
- When no valid support email is configured, the contact link remains hidden and no placeholder address is shown.
