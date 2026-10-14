# Plan

- Reuse the service-offering DTO and add a public endpoint that returns all active offerings while preserving the existing monthly-only plans endpoint.
- Split monthly and one-off offerings in the public mentor profile.
- Add Mentee-owned one-off list and detail routes using the existing public layout and design tokens.
- Keep scheduling disabled until a separately approved availability feature provides real slots and hold behavior.
- Verify the controller contract, rendered states, frontend tests, and production build.
