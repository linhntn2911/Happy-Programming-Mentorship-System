# Implementation Plan: Mentor Profile & Teaching Skills Management

**Branch**: `001-mentor-profile-persistence` | **Date**: 2026-10-07 | **Spec**: [spec.md](./spec.md)

## Summary

Build on the existing JPA mappings with transactional mentor profile/skill service operations, profile and active-skill endpoints, and a frontend editor. Profile fields map to existing `users` and `mentor_profiles` columns; skill relations map to existing `skills`/`mentor_skills`. Preserve the existing featured catalog endpoint and do not change schema. The local demo identity is opt-in, fixed from server configuration, and is not a production authentication mechanism.

## Technical Context

**Language/Version**: Java 25; JavaScript ES modules
**Primary Dependencies**: Spring Boot 3.5.6, Spring Data JPA, Jakarta Bean Validation, SQL Server JDBC, Vite, Tailwind CSS 4
**Storage**: Existing SQL Server database `HappyProgramming`; schema is defined in `docs/database/init/schema_31_tables.sql`
**Testing**: Maven / Spring Boot tests; frontend Vite build; SQL Server integration tests require a reachable, correctly seeded local database
**Target Platform**: Local Windows development environment and backend service; responsive web frontend
**Project Type**: Spring Boot REST backend and Vite frontend
**Performance Goals**: Avoid N+1 reads for mentor skills; profile loading uses bounded repository queries
**Constraints**: Do not change the 31-table schema or enable Hibernate DDL; never accept mentor ID from client; demo identity is disabled by default; exclude service-offering price editing; do not commit database credentials
**Scale/Scope**: Existing profile/skill mappings plus narrow user profile fields, one service, mentor and skill endpoints, one profile editor, focused tests

## Constitution Check

- Reuse capability packages and existing SQL schema: **Pass**.
- Keep entities internal and use DTOs at API boundaries: **Pass**.
- Keep controllers thin and preserve existing endpoint contract: **Pass**.
- Validate fields and URLs against the schema and SRS: **Pass**.
- Make no schema changes and keep Hibernate DDL disabled: **Pass**.
- Protect credentials and do not log secrets: **Pass**.
- Add focused unit, endpoint, and persistence tests: **Pass**.
- Until real authentication exists, resolve ownership only through explicitly enabled fixed local-demo identity; disabled by default: **Pass with explicit limitation**.
- Align profile and teaching-skill behavior with SRS UC10/UC11 and the existing 31-table schema: **Pass**.

The checked-in `.specify/memory/constitution.md` contains only template placeholders; the repository `AGENTS.md` and `CLAUDE.md` are the operative project rules.

## Design Decisions

1. Retain existing `MentorProfile`, `Skill`, and composite `MentorSkill` mappings. Add a narrow `users` entity mapping for full name, bio, GitHub, LinkedIn, portfolio, update timestamp, and read-only `role_code`/`status` fields needed to verify the configured demo account is an active mentor.
2. Combine profile and selected active skill IDs in a validated PUT DTO. In a single transaction, update user/profile rows and synchronize `mentor_skills`. Preserve verification metadata for unchanged links; new links are unverified. Reject duplicate, unknown, inactive, and empty skill selections.
3. Load a profile by server-configured mentor user ID only if local demo mode is explicitly enabled and the configured ID is positive. Never accept identity from request parameters/body. This shim is not production authentication.
4. Keep the SQL Server URL and username defaults local to backend configuration, but require password through `DB_PASSWORD`.
5. Return API success through `ApiResponse` and use profile/skill DTOs; entities remain internal.
6. Use the SRS UC10/UC11 scope: full name, bio, experience, GitHub/LinkedIn/portfolio and teaching skills. Do not add avatar file upload in this change.
7. Do not add hourly-rate fields. SRS UC10/UC11 does not define profile pricing; existing `service_offerings` models only `MONTHLY` and `ONE_OFF`. Offering management is a separate feature.
8. Keep `GET /api/mentors` and its sample catalog behavior unchanged.

## Project Structure

```text
backend/src/main/java/vn/happyprogramming/mentor/
├── MentorAccount.java
├── MentorAccountRepository.java
├── MentorService.java
├── MentorController.java
├── MentorProfile.java
├── Skill.java
├── MentorSkill.java
├── MentorSkillId.java
├── MentorProfileRequest.java
├── MentorProfileResponse.java
├── SkillTagResponse.java
├── MentorSkillResponse.java
├── MentorProfileRepository.java
├── SkillRepository.java
└── MentorSkillRepository.java

backend/src/test/java/vn/happyprogramming/mentor/
├── MentorServiceTest.java
├── MentorControllerTest.java
└── MentorProfileTransactionIntegrationTest.java

frontend/src/
├── pages/MentorProfilePage.js
├── services/mentorService.js
├── main.js
└── components/layout/Header.js
```

## Requirement Mapping

| Requirement | Plan item | Verification |
|---|---|---|
| FR-001–FR-003 | Exact existing table and composite-key mappings | Mapping tests and schema review |
| FR-004 | Active-only skill reads | Repository test and endpoint test |
| FR-005 | Separate DTOs with validation | Validator/service tests |
| FR-006 | Environment-only DB password | Config inspection |
| FR-007 | Featured endpoint compatibility | Existing controller contract test |
| FR-008 | No schema creation or migrations | Diff review |
| FR-009 | Existing user/profile fields are read and updated | Service/controller tests |
| FR-010 | Atomic profile and active skills update | Transactional service tests and SQL Server rollback integration test |
| FR-011 | Active catalog endpoint | Skill endpoint test |
| FR-012 | ApiResponse envelope and entity hiding | MockMvc contract test |
| FR-013 | Fixed opt-in demo ID, no client identity | Disabled/configured identity tests |
| FR-014 | Accessible async editor feedback | Frontend build and browser/manual test |
| FR-015 | No hourly pricing field | API contract and UI review |

## Execution Task List

See [tasks.md](./tasks.md). Phase 2 execution order:

1. Add narrow account mapping and update request/response DTOs.
2. Implement the profile/skills transactional service and local demo identity guard.
3. Wire profile and catalog endpoints; preserve the existing featured endpoint.
4. Build the editor as a separate frontend route with loading, error, validation, and success states.
5. Run focused tests/build, run the SQL Server rollback test when local DB access is configured, and review scope/security boundaries.

## Complexity Tracking

The local demo identity is an explicitly user-selected temporary compatibility boundary. It is disabled by default and must not be enabled in deployed environments; production rollout requires real authentication.
