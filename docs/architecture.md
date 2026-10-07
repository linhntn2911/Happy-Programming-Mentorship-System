# HappyProgramming Architecture Overview

## Repository Structure
```text
HappyProgramming/
├── backend/       # Spring Boot 3.5.x REST API
├── frontend/      # Vite + Tailwind CSS 4 + Modular JavaScript client
├── specs/         # Spec Kit feature artifacts
├── docs/          # Architecture and operational documentation
├── AGENTS.md
└── CLAUDE.md
```

## Backend Architecture
- **Language & Runtime:** Java 17, Spring Boot 3.5.x
- **Communication:** RESTful APIs under `/api/`
- **Package Convention:** Layered packages under `com.happyprogramming`, following [Package Diagram1.docx](../Package%20Diagram1.docx).
- **Entry point:** `com.happyprogramming.HpmsApplication`; tests mirror production packages.

| Package | Responsibility | Current implementation |
| --- | --- | --- |
| `config` | Infrastructure and Spring bean configuration | Planned |
| `constant` | Shared constants and status/role enums | Planned |
| `controller` | HTTP requests and service delegation | `RootController`, `MentorController` |
| `dto` | Request/response data, separate from entities | `ApiResponse`, `MentorCard` |
| `entity` | SQL Server JPA mappings | Planned |
| `repository` | Spring Data persistence queries | Planned |
| `service` | Business rules and transaction orchestration | `MentorCatalog` (prototype in-memory catalog) |
| `security` | Authentication, authorization, ownership | Planned |
| `integration` | External service adapters | Planned |
| `scheduler` | Timed work delegated to services | Planned |
| `utils` | Shared utility functions | Planned |

Dependencies: controller → service → repository → entity; controller/service use DTOs; service uses integration adapters; scheduler calls service; config wires infrastructure. Constants and utilities must not depend on controllers. The document's external integrations and security capabilities are target design, not evidence that they already work. Current mentor reads still use `MentorCatalog`, not SQL Server repositories.

Use `*Controller`, `*Service`, `*Repository`, `*Request`/`*Response`, `*Status`, `*Client`, `*Config`, and `*Scheduler` names for new types according to responsibility. Retain existing DTO/catalog names during this structural move. Do not create empty packages for planned features. Maven coordinates remain `vn.happyprogramming:happyprogramming-backend`; artifact coordinates are independent of Java package names.

## Frontend Architecture
- **Tooling:** Vite, Tailwind CSS 4
- **Language:** ES Modules JavaScript
- **Design Tokens:**
  - Primary purple: `#8b46e8`
  - Dark purple: `#7431d0`
  - Ink: `#25143f`
  - Lavender: `#f1e8ff`
  - Cream background: `#fbf9ff`
  - Border: `#e8e0f1`
- **Network Layer:** Centralized `services/apiClient.js`
