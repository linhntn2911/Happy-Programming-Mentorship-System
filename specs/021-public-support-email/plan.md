# Plan

Reuse the existing system_configs row platform.support_email and audited PUT /api/admin/settings. Normalize SettingsChange.supportEmail in its record constructor before Bean Validation. No schema changes or seeds are needed.

Expose GET /api/public/contact via PublicContactController, PublicContactService and an allowlisted AdminRepository.supportEmail query. Return only PublicContactResponse(supportEmail). Blank/missing row becomes an empty address; malformed storage or database failure returns a generic 503. Validate legacy stored email before publishing. Responses use no-store so a new footer mount observes the current value. Permit only the exact GET endpoint in SecurityConfig.

Use the existing Footer with a registered hp-support-contact custom element. A small shared service calls apiClient; the element mounts on connection and disposes on removal, which also covers asynchronous page rendering without changing router behavior. Reuse existing text/button/focus styles, escape text and percent-encode the mailto target. No permanent client cache. Showcase the shared footer state.

Validation: public read/security controller tests, repository persistence/isolation tests, DTO normalization and audit tests; frontend state, retry, encoding and stale-result tests. Because security configuration and application wiring change, run the full backend suite. Because a shared footer/bootstrap module changes, run frontend suite and build. Document any unavailable runtime checks.

Analysis: all acceptance cases map to the tasks and contract; only one new allowlisted public GET is introduced. Historical specs' auth/provider descriptions do not govern this bounded change. Current layered packages and shared/apiClient.js take precedence over older path examples in the constitution. No approval ambiguity remains for this user-requested feature.
