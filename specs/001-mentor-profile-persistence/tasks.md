# Tasks: Mentor Profile & Teaching Skills Management

**Input**: Design documents from `/specs/001-mentor-profile-persistence/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [data-model.md](./data-model.md), [research.md](./research.md), [quickstart.md](./quickstart.md)

## Phase 1: Setup

**Purpose**: Verify existing Spring Data JPA and SQL Server support before adding mappings.

- [x] T001 Verify the existing SQL Server/JPA dependencies and current database property names in `backend/pom.xml` and `backend/src/main/resources/application.properties`.

## Phase 2: Foundational

**Purpose**: Keep the existing local database configuration safe and prevent schema generation.

- [x] T002 Remove any checked-in datasource password fallback and require `DB_PASSWORD` in `backend/src/main/resources/application.properties`; preserve the local `HappyProgramming` URL and `sa` username defaults.

## Phase 3: User Story 1 - Preserve mentor profile data (Priority: P1)

**Goal**: Map the existing `mentor_profiles` table and provide validated profile request/response DTOs and repository access.

**Independent Test**: Build the backend, validate profile field constraints, inspect entity mappings against the SQL script, and verify the current featured mentor endpoint test remains unchanged.

### Tests for User Story 1

- [x] T003 [P] [US1] Add DTO validation and profile primary-key mapping tests in `backend/src/test/java/vn/happyprogramming/mentor/MentorPersistenceMappingTest.java`.

### Implementation for User Story 1

- [x] T004 [US1] Map `mentor_profiles.user_id` as the primary key and map all documented profile fields and UTC timestamps in `backend/src/main/java/vn/happyprogramming/mentor/MentorProfile.java`.
- [x] T005 [P] [US1] Add `MentorProfileRequest` validating required headline (max 250), job title (max 150), biography (50–1000), and experience (0–80 with one decimal); exclude approval/publication fields in `backend/src/main/java/vn/happyprogramming/mentor/MentorProfileRequest.java`.
- [x] T006 [P] [US1] Add the safe profile response projection in `backend/src/main/java/vn/happyprogramming/mentor/MentorProfileResponse.java`.
- [x] T007 [US1] Add profile lookup by user ID in `backend/src/main/java/vn/happyprogramming/mentor/MentorProfileRepository.java`.

## Phase 4: User Story 2 - Relate profiles to active skill tags (Priority: P1)

**Goal**: Map the existing skill catalog and association rows while ensuring mentor skill reads exclude inactive catalog skills.

**Independent Test**: Verify the composite association key and execute the repository query against a database containing active and inactive skills; only active tags should be returned.

### Tests for User Story 2

- [x] T008 [P] [US2] Add composite-key and active-skill repository tests in `backend/src/test/java/vn/happyprogramming/mentor/MentorSkillRepositoryTest.java`.

### Implementation for User Story 2

- [x] T009 [P] [US2] Map `dbo.skills`, including the active flag and scalar category/creator keys, in `backend/src/main/java/vn/happyprogramming/mentor/Skill.java`.
- [x] T010 [P] [US2] Map the `(mentor_id, skill_id)` embedded key in `backend/src/main/java/vn/happyprogramming/mentor/MentorSkillId.java`.
- [x] T011 [US2] Map `dbo.mentor_skills` and its profile/skill relationships using the composite key in `backend/src/main/java/vn/happyprogramming/mentor/MentorSkill.java`.
- [x] T012 [P] [US2] Add response DTOs for catalog skills and mentor-skill links in `backend/src/main/java/vn/happyprogramming/mentor/SkillTagResponse.java` and `backend/src/main/java/vn/happyprogramming/mentor/MentorSkillResponse.java`.
- [x] T013 [P] [US2] Add active catalog lookup in `backend/src/main/java/vn/happyprogramming/mentor/SkillRepository.java`.
- [x] T014 [US2] Add a mentor-skill query that fetches skill rows and filters `skill.active = true`, ordered by display order, in `backend/src/main/java/vn/happyprogramming/mentor/MentorSkillRepository.java`.

## Phase 5: User Story 3 - Manage profile information (Priority: P1)

**Goal**: Implement SRS UC10 profile read/update using existing `users` and `mentor_profiles` columns.

**Independent Test**: In local-demo mode with a valid configured user ID, GET returns profile details and PUT saves valid profile and skill data; with demo mode disabled, `/me` fails closed.

### Tests for User Story 3

- [x] T017 [P] [US3] Add service tests for profile composition, validation, atomic update decisions, disabled/missing demo identity, and rejection of non-mentor/inactive/locked demo accounts in `backend/src/test/java/vn/happyprogramming/mentor/MentorServiceTest.java`.
- [x] T018 [P] [US3] Add controller contract tests for GET/PUT `/api/mentors/me/profile`, error statuses, and ApiResponse JSON in `backend/src/test/java/vn/happyprogramming/mentor/MentorControllerTest.java`.

### Implementation for User Story 3

- [x] T019 [US3] Add a narrow `users` table entity for full name, bio, GitHub, LinkedIn, portfolio, update timestamp, and read-only role/status eligibility fields in `backend/src/main/java/vn/happyprogramming/mentor/MentorAccount.java`.
- [x] T020 [US3] Add lookup for existing mentor account rows by ID in `backend/src/main/java/vn/happyprogramming/mentor/MentorAccountRepository.java`.
- [x] T021 [US3] Extend the profile PUT DTO with required full name (max 150), biography (trimmed length 50–1000), experience (0–80, one decimal), optional valid URLs (max 500), and non-empty unique positive skill IDs in `backend/src/main/java/vn/happyprogramming/mentor/MentorProfileRequest.java`.
- [x] T022 [US3] Extend the profile response DTO with safe account fields and current active skills in `backend/src/main/java/vn/happyprogramming/mentor/MentorProfileResponse.java`.
- [x] T023 [US3] Implement local-demo identity resolution from server configuration, transactional profile read/update, field validation, and full active skill synchronization in `backend/src/main/java/vn/happyprogramming/mentor/MentorService.java`.
- [x] T024 [US3] Add `hpms.mentor.demo.enabled` (default false) and `hpms.mentor.demo.user-id` (default empty) configuration keys in `backend/src/main/resources/application.properties`.
- [x] T025 [US3] Map GET/PUT `/api/mentors/me/profile` while preserving GET `/api/mentors` in `backend/src/main/java/vn/happyprogramming/mentor/MentorController.java`.

## Phase 6: User Story 4 - Select teaching skills (Priority: P1)

**Goal**: Provide active catalog endpoint and accessible UI to edit profile details and active teaching-skill tags.

**Independent Test**: Frontend loads current profile and active skills, displays selected tags, saves changes, and reports loading/validation/API failures and success accessibly.

### Tests for User Story 4

- [x] T026 [P] [US4] Add active skill endpoint response/filter contract coverage in `backend/src/test/java/vn/happyprogramming/mentor/MentorControllerTest.java`.

### Implementation for User Story 4

- [x] T027 [US4] Expose GET `/api/skills?active=true` using the active skill repository and ApiResponse DTOs in `backend/src/main/java/vn/happyprogramming/mentor/MentorController.java`.
- [x] T028 [US4] Add `getMyProfile`, `updateMyProfile`, and `getActiveSkills` API calls while preserving `getFeaturedMentors` in `frontend/src/services/mentorService.js`.
- [x] T029 [US4] Create a profile editor with name, bio, years of experience, GitHub/LinkedIn/portfolio fields, and selected skill badges in `frontend/src/pages/MentorProfilePage.js`; omit avatar upload and hourly pricing.
- [x] T030 [US4] Add an isolated `#/mentor/profile` route with async loading, validation/error, disabled-submit, and success behavior in `frontend/src/main.js`.
- [x] T031 [US4] Add a discoverable local-demo profile entry without changing existing public navigation behavior in `frontend/src/components/layout/Header.js`.
- [x] T032 [US4] Validate rendering, keyboard form controls, responsive layout, no horizontal overflow, and non-injection of API field values for `frontend/src/pages/MentorProfilePage.js`.

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Verify compatibility and document safe local connection setup.

- [x] T015 Document safe local database environment-variable setup in `specs/001-mentor-profile-persistence/quickstart.md` and run the focused persistence-foundation tests before Phase 2 implementation.
- [x] T016 Record the persistence foundation's original scope: no schema changes, CRUD routes, frontend edits, or tracked database password.
- [x] T033 [P] Add API contract for profile GET/PUT and active skills GET in `specs/001-mentor-profile-persistence/contracts/mentor-profile-api.md`.
- [x] T034 Run focused backend unit/controller tests and frontend build for the completed Phase 2 feature; record that the full database-dependent suite is unavailable without local SQL Server credentials.
- [x] T035 Confirm schema is unchanged, featured mentor listing remains compatible, demo mode defaults off, and no secrets are tracked.
- [ ] T036 Run the SQL Server-backed rollback integration test that verifies failed skill synchronization persists neither profile/account values nor mentor-skill changes in `backend/src/test/java/vn/happyprogramming/mentor/MentorProfileTransactionIntegrationTest.java` (blocked until DB_PASSWORD, HPMS_MENTOR_TEST_USER_ID, and local SQL Server access are configured).
- [x] T037 Keep the profile editor out of indefinite loading with a bounded API request, a `finally` loading reset, route cleanup, and clearly labelled read-only development data when profile/catalog GET requests fail; cover request fallback and route contracts in frontend and controller tests.

## Dependencies & Execution Order

- T001 precedes all implementation.
- T002 is independent of entity work after T001.
- T003 precedes T004 and T007.
- T008 precedes T009–T014.
- T010 precedes T011; T009 and T011 precede T012/T014.
- T017/T018 precede the service/controller implementation tasks T019–T025; T036 verifies their rollback behavior after implementation and requires a configured SQL Server test database to execute.
- T019/T020 and persistence tasks T004/T007/T008/T009–T014 precede T023.
- T026 precedes T027; T023 and T025/T027 precede frontend integration T028–T032.
- T033 is completed before endpoint implementation; T034/T035 follow all feature work.
- User Stories 1 and 2 are completed persistence prerequisites for User Stories 3 and 4.

## Parallel Opportunities

- T005 and T006 can proceed independently after T003.
- T009, T010, T012, and T013 touch distinct files and can be parallelized once T008 is in place; T011 and T014 follow their required model dependencies.
- T017 and T018 are independent test authoring tasks.
- T036 test code can be authored before service implementation, but execution follows T023 and requires SQL Server test access.
- T019/T020 and T026/T033 can be drafted in parallel; service and frontend work wait for their stated dependencies.

## Implementation Strategy

Persistence tasks T001–T016 are complete. Implement US3 (profile read/update) then US4 (active skill catalog and frontend editor) as separate verification slices. Preserve `GET /api/mentors` throughout. The profile form follows SRS UC10/UC11 and existing schema; no hourly-rate field is introduced.
