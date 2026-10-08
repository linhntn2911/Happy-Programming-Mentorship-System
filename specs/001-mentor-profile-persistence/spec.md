# Feature Specification: Mentor Profile & Teaching Skills Management

**Feature Branch**: `001-mentor-profile-persistence`

**Created**: 2026-10-07

**Status**: In Progress

**Input**: Mentor profile persistence plus Phase 2 service, profile/teaching-skill APIs, and frontend editing flow, aligned with SRS UC10/UC11 and the existing 31-table schema.

## User Scenarios & Testing

### User Story 1 - Preserve mentor profile data (Priority: P1)

As a mentor platform operator, I need mentor profiles represented against the existing database schema so profile data can be loaded and updated without replacing the existing mentor discovery implementation.

**Why this priority**: The current mentor catalog is in-memory sample data and cannot represent the relational profile record.

**Independent Test**: Verify profile fields map to the existing table and repository operations address a profile by its owning user identifier.

**Acceptance Scenarios**:

1. **Given** a profile row in the existing database, **When** it is loaded, **Then** its persisted values map to a profile DTO without exposing a persistence entity as an API response.
2. **Given** a profile identifier, **When** a repository looks up that profile, **Then** it uses the `mentor_profiles.user_id` primary key and does not create or modify schema.

### User Story 2 - Relate profiles to active skill tags (Priority: P1)

As a mentor, I need profile skill tags to use the platform's shared skill catalog so only currently active skills are offered for mentor profile reads and selection.

**Why this priority**: Shared active skills preserve staff control over the platform-wide skill catalog.

**Independent Test**: Seed active and inactive skills linked to a profile and verify the mentor-skill read path returns active skills only.

**Acceptance Scenarios**:

1. **Given** a profile linked to active and inactive skills, **When** its mentor-skill repository query runs, **Then** only active skills are returned.
2. **Given** the same mentor and skill pair, **When** it is represented in persistence, **Then** the composite key prevents duplicate mentor-skill links.

### User Story 3 - Manage profile information (Priority: P1)

As an active mentor, I want to view and update my profile biography, name, experience, and professional links so that mentees see current background information.

**Why this priority**: SRS UC10 requires the mentor to maintain current public profile information.

**Independent Test**: With the local demo identity explicitly enabled and a profile/account row present, retrieve the combined profile and update permitted fields; verify both database records and the returned DTO reflect the update.

**Acceptance Scenarios**:

1. **Given** the configured local demo mentor has an account and profile, **When** the mentor opens the profile editor, **Then** the system loads the current name, biography, years of experience, GitHub, LinkedIn, portfolio link, and active teaching skills.
2. **Given** valid updated profile values and at least one active skill ID, **When** the mentor saves, **Then** profile/account values and skill associations are updated atomically and a success confirmation is shown.
3. **Given** an invalid biography or malformed external URL, **When** the mentor saves, **Then** validation errors are returned and no profile fields or skill links are changed.
4. **Given** demo identity is not explicitly enabled and configured, **When** a `/me` endpoint is called, **Then** the service refuses the request rather than selecting an arbitrary mentor.

### User Story 4 - Select teaching skills (Priority: P1)

As an active mentor, I want to select skills from the active staff-managed catalog and remove skills I no longer teach.

**Why this priority**: SRS UC11 requires skills to be selected from the central catalog and used for discovery filtering.

**Independent Test**: Load the active skill list, select one or more, save, and verify active mentor-skill associations are returned in display order.

**Acceptance Scenarios**:

1. **Given** the skill catalog includes active and inactive entries, **When** the mentor loads available skills, **Then** only active entries are selectable.
2. **Given** a selected skill is no longer active, **When** the mentor submits it, **Then** the update is rejected without changing the profile or association rows.
3. **Given** the mentor removes every selected skill, **When** the mentor saves, **Then** the system rejects the update and asks for at least one teaching skill.

## Edge Cases

- A profile has no skill links; a GET returns an empty list, but a profile update cannot remove the last selected skill.
- A profile references a missing user, skill, or verifier; the existing database foreign key remains authoritative.
- A skill becomes inactive after it has been linked; it is omitted from active-skill reads without deleting the historical relationship row.
- Local database credentials are absent; the application must fail configuration clearly rather than silently using a checked-in password.
- Existing featured-mentor API behavior remains unchanged in this persistence-foundation scope.
- Demo identity is disabled or has no configured positive user ID; `/me` operations fail closed.
- A skill ID list includes duplicates, unknown IDs, inactive IDs, or exceeds reasonable request limits; reject the entire update.
- External profile links are blank or invalid URLs; blanks clear optional links, malformed URLs are rejected.

## Requirements

### Functional Requirements

- **FR-001**: Persistence mappings MUST match the existing SQL Server definitions of `mentor_profiles`, `skills`, and `mentor_skills`.
- **FR-002**: A mentor profile MUST be identified by its owning user ID, consistent with the existing primary key and foreign key.
- **FR-003**: Mentor-skill links MUST use the existing composite key and preserve their experience, verification, display-order, and creation fields.
- **FR-004**: The repository read path for mentor skill tags MUST return only skills whose catalog status is active.
- **FR-005**: Request and response DTOs MUST be separate from JPA entities and validate mutable profile fields against database constraints.
- **FR-006**: SQL Server connection properties MUST target the local `HappyProgramming` database by default and read credentials from environment variables; no real password may be committed.
- **FR-007**: The implementation MUST preserve the current featured mentor endpoint and its response shape.
- **FR-008**: This scope MUST NOT introduce schema creation or migrations; profile and skill HTTP endpoints are in scope only as bounded in FR-009–FR-015.
- **FR-009**: The mentor profile API MUST read and update the profile fields represented by existing `users` and `mentor_profiles` columns, including full name, biography, years of experience, GitHub, LinkedIn, and portfolio URL. Until real authentication exists, use only the guarded local-demo identity in FR-013.
- **FR-010**: The profile update operation MUST update permitted profile values and the complete active skill selection atomically; it MUST reject empty, duplicate, unknown, or inactive skill selections.
- **FR-011**: The active skill catalog endpoint MUST return only active skills, ordered by display name.
- **FR-012**: Profile and skill API response bodies MUST use DTOs and the established `ApiResponse` envelope; persistence entities MUST NOT be serialized.
- **FR-013**: Until application authentication is implemented, mentor `/me` operations MUST be available only through an explicitly enabled local-demo mode with a configured fixed mentor user ID; the client MUST NOT choose or submit that ID.
- **FR-014**: The frontend MUST provide accessible loading, error, validation, and success feedback for the mentor profile and teaching-skill editing flow.
- **FR-015**: The profile flow MUST NOT expose an hourly-rate field. Service prices are represented by existing `service_offerings` rows (`MONTHLY`/`ONE_OFF`) and are outside SRS UC10/UC11.

### Key Entities

- **Mentor Profile**: Profile information keyed to a user, with headline, job and company details, biography, experience, languages, visibility, capacity, approval metadata, and timestamps.
- **Skill**: A globally managed technical skill with category, name, slug, description, and active state.
- **Mentor Skill**: The association between a mentor profile and a skill, including experience, verification metadata, display order, and creation time.

## Success Criteria

### Measurable Outcomes

- **SC-001**: All mapped profile, skill, and association fields correspond to the supplied 31-table schema without generated DDL or new database tables.
- **SC-002**: Repository tests demonstrate that inactive skills are excluded and active skills are returned for a mentor profile.
- **SC-003**: DTO validation rejects profile values outside the current schema constraints before persistence.
- **SC-004**: No database password is present in tracked application configuration, and the existing featured mentor test contract remains compatible.
- **SC-005**: A mentor can load and save valid profile information and at least one active skill through the editing page without supplying an identity in request data.
- **SC-006**: Invalid or inactive skill IDs and invalid profile fields cause no partial database update.
- **SC-007**: A local demo identity is unusable unless explicitly enabled and configured; no client-controlled mentor ID is accepted.

## Assumptions

- `docs/database/init/schema_31_tables.sql` is the intended schema contract for the local database; the actual local SQL Server instance must be separately confirmed before database integration tests.
- SQL Server `DATETIME2` timestamps represent UTC as documented in the schema.
- The provided `users`, `skill_categories`, and verifier foreign keys are mapped as scalar IDs in this bounded change because their entities are outside the requested three-table scope.
- Real authentication and authorization are not present yet; the user explicitly selected an opt-in fixed mentor ID for local demonstration only. The guard is disabled by default and is not suitable for production.
- The local SQL Server password is supplied through `DB_PASSWORD` in the developer's environment and is not stored in source control.
- SRS_Group3_HPMS.docx UC10 and UC11 govern profile and teaching-skill behavior. Avatar upload is deferred because it requires the separate secure file-upload flow.
- No hourly pricing attribute appears in SRS UC10/UC11 or the 31-table profile schema; pricing belongs to monthly or one-off `service_offerings` and is not edited by this feature.
- Current application code has no authentication framework. The selected fixed-ID identity mechanism is an opt-in local demonstration shim only, disabled by default and not suitable for deployment.
