# Research: Mentor Dashboard Overview

## Decisions

### Datasource recovery and HikariCP

- **Decision**: Keep HikariCP and SQL Server JDBC defaults, and make Hikari `connection-timeout=30000`, `keepalive-time=120000`, and `max-lifetime=1800000` explicit. Leave pool size, validation query, and SQL Server retry parameters unchanged without measurements or evidence.
- **Rationale**: `Could not open JPA EntityManager for transaction` is a wrapper, not a diagnosis; inspect the nested `SQLException`/`SQLServerException`. Hikari keepalive probes only idle connections, while max lifetime retires connections after return; neither rescues an active broken transaction. Initial environment inspection found no listener on `localhost:1433`, which pool settings cannot repair.
- **Alternatives considered**: Increasing pool size or connection wait was rejected because no pool exhaustion evidence exists; setting a custom validation query was rejected because Hikari prefers JDBC 4 `Connection.isValid()` with the Microsoft driver; disabling datasource initialization failure was rejected because it would mask an unavailable database; a password fallback was rejected because credentials must not be committed.
- **References**: [Spring Boot 3.5 datasource configuration](https://docs.spring.io/spring-boot/3.5/how-to/data-access.html), [HikariCP configuration](https://github.com/brettwooldridge/HikariCP/blob/HikariCP-6.3.3/README.md#configuration-knobs-baby), [Microsoft JDBC connection URL](https://learn.microsoft.com/en-us/sql/connect/jdbc/building-the-connection-url?view=sql-server-ver17), and [Microsoft JDBC connectivity troubleshooting](https://learn.microsoft.com/en-us/sql/connect/jdbc/troubleshooting-connectivity?view=sql-server-ver17). Confirm the actual managed HikariCP version in the project dependency tree before assuming patch-specific defaults.

### Net earnings

- **Decision**: Calculate lifetime net earnings per mentor from successful payments, subtract successful refunds for each payment, and apply the immutable commission snapshot recorded on that payment.
- **Rationale**: This follows the user-selected definition and the US-09 gross-minus-commission rule without retroactively applying a changed global commission rate. Calculation and rounding are performed per payment in VND.
- **Alternatives considered**: Summing only `MENTOR_RELEASE` ledger entries was rejected because it represents disbursement timing rather than the requested full successful revenue; applying the current `system_configs` rate was rejected because historic payments preserve their own rate snapshot.

### Request decisions

- **Decision**: Perform a conditional, ownership-scoped update from `PENDING` to `ACCEPTED` or `REJECTED`, only if the response deadline has not passed, setting `responded_at` from SQL Server UTC time.
- **Rationale**: This is race-safe under concurrent clicks and agrees with the schema trigger/state machine. Returning one generic conflict for zero updated rows does not expose whether another mentor owns an ID.
- **Alternatives considered**: Read-then-write without an atomic condition was rejected because concurrent decisions could both appear successful. Creating checkout records on acceptance was rejected by the approval-first rules.

### Cancellation and refund notices

- **Decision**: Return a bounded, newest-first read projection from cancelled requests/subscriptions and their linked refund rows.
- **Rationale**: The existing 31-table schema has no notification entity; deriving current persisted state avoids adding an unsynchronized duplicate store or schema migration.
- **Alternatives considered**: Adding a notification table or emitting push/email notices is outside this dashboard scope and would require a separate persistence/delivery feature.

### Identity and API surface

- **Decision**: Reuse the existing fail-closed, server-configured local mentor identity with no request parameter/body identity; keep it disabled by default.
- **Rationale**: No authenticated principal exists in the current frontend/backend. The existing profile API already documents this compatibility shim and forbids its use in deployed environments.
- **Alternatives considered**: Trusting a client-supplied mentor ID was rejected as an authorization vulnerability. Building complete authentication is outside the bounded dashboard feature.

### Frontend

- **Decision**: Add a separate hash route and mentor-dashboard service/page, use the existing UI tokens, and demonstrate any reusable metric card in the component showcase.
- **Rationale**: This preserves homepage and mentor-profile behavior and fits the current Vite/Tailwind architecture.
- **Alternatives considered**: Rendering API-derived values through unescaped HTML templates was rejected; dynamic values will be placed as text nodes/DOM properties.

## Evidence

- `specs/SPEC.md`, US-05 and GB-16: 48-hour response window; timed-out pending applications transition to `EXPIRED`.
- `specs/SPEC.md`, US-06, US-09, and the approval-first state machine: net earnings formula; accepting a request does not create payment, escrow, subscription, or workspace data; checkout happens separately after acceptance.
- `docs/database/init/schema_31_tables.sql`: `mentorship_requests` stores owner, state, learning goals, submission, response deadline, and response time; `payments` stores successful payment state and commission snapshot; `refunds` stores refund state and amount; `reviews` stores rating and visibility/moderation state; `escrow_ledger_entries` stores mentor releases and reversals.
- `docs/database/init/schema_31_tables.sql`: no notification table exists in the 31-table schema.
- Environment probe: no listener was found on local TCP port 1433 at the time of inspection. This is environmental evidence, not proof that all reported EntityManager errors have the same root cause.

## Outstanding Limitation

No database-backed connection or transaction can be validated until SQL Server is listening on the configured host/port and valid credentials are supplied through `DB_PASSWORD`. The repository has no UC24/UC26 wireframe asset beyond the layout requirements in the user request.
