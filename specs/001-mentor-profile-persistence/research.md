# Research: Mentor Profile Persistence Foundation

## Decision: Map the documented SQL Server schema without generating DDL

**Rationale**: The project sets `spring.jpa.hibernate.ddl-auto=none`; the supplied schema script already defines the target 31-table database and relational constraints. Entities must match it rather than create or alter schema.

**Alternatives considered**: Hibernate schema generation and a new Flyway migration were rejected because the request is to use the existing local database and no schema change is required.

## Decision: Use a composite-key association entity for mentor skills

**Rationale**: `mentor_skills` has a `(mentor_id, skill_id)` primary key and stores experience, verification, display order, and creation time. A plain many-to-many mapping would obscure these association attributes.

**Alternatives considered**: A bare `@ManyToMany` was rejected because it does not represent association metadata as a domain record.

## Decision: Filter active skills in the mentor-skill repository query

**Rationale**: `skills.is_active` belongs to the referenced skill, not the link table. Filtering the joined skill in an explicit query guarantees mentor profile reads omit inactive skills without globally preventing other workflows from loading them.

**Alternatives considered**: A global Hibernate restriction on `Skill` was rejected because future administrative operations may need to inspect inactive skills.

## Decision: Read SQL Server credentials from environment

**Rationale**: The local SQL Server URL and `sa` username can be defaults, while the password remains outside version control and is provided by `DB_PASSWORD`.

**Alternatives considered**: A literal password or a committed local `.env` file was rejected because repository rules prohibit committing credentials.

## Remaining external prerequisite

The local database must already exist and match `docs/database/init/schema_31_tables.sql`. This change does not connect to or alter the user's SQL Server instance.

## Decision: Use the existing user/profile columns for SRS UC10

**Rationale**: The source SRS (`SRS_Group3_HPMS.docx`, UC10) requests personal information, biography, years of experience, and GitHub/LinkedIn links. The 31-table schema stores full name and external links on `users`, and biography/experience on `mentor_profiles` (with an additional nullable `users.bio` projection).

**Alternatives considered**: Adding new profile columns was rejected because the schema already provides these fields and schema changes are out of scope.

## Decision: Do not model hourly rates in the profile flow

**Rationale**: UC10/UC11 do not describe pricing edits. The existing `service_offerings` table stores packages by `MONTHLY`/`ONE_OFF`, price, duration, and service metadata; it has no hourly rate. The profile endpoint will not invent an hourly field.

**Alternatives considered**: Adding hourly rate to `mentor_profiles` or overloading an offering price was rejected because it contradicts the schema and existing offering types.

## Decision: Gate local profile edits with a fixed configured demo identity

**Rationale**: The user selected a server-configured local-demo mentor ID because the repository has no authentication. The feature refuses all `/me` operations unless local demo mode and a positive user ID are explicitly configured; request data cannot select a mentor.

**Limitation**: This guard is not authentication and must remain disabled outside isolated local development until the platform's actual authentication is implemented.
