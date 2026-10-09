# Plan

The user's supplied package document supersedes the previous capability-based organization. Move the Spring Boot entry point to `com.happyprogramming`; move controllers to `controller`, API types to `dto`, and MentorCatalog to `service`. Mirror test packages and fix imports. Leave Maven coordinates unchanged because changing Java package names does not require changing artifact identity.

No API, frontend, schema, data, security behavior, or dependencies change. Preserve the current catalog implementation; persistence replacement is a separate feature. Future package responsibilities and naming conventions are recorded in AGENTS.md and docs/architecture.md.

Validate compilation and existing controller coverage where the local environment permits. No new tests are needed for pure moves. Existing database tests require a configured SQL Server and are not necessary for this package-only check. Restart an already running backend to load the new compiled entry point.
