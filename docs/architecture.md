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
- **Language & Runtime:** Java 25, Spring Boot 3.5.x
- **Communication:** RESTful APIs under `/api/`
- **Package Convention:** Business capabilities under `vn.happyprogramming`
  - `mentor/`: Mentor profiles, catalog, search
  - `user/`: Account and profile management
  - `auth/`: Authentication and JWT token issuance
  - `mentorship/`: Monthly mentorship applications and trials
  - `session/`: One-off session booking and scheduling
  - `payment/`: VNPay integration and idempotent transaction handling
  - `chat/`: Mentorship messaging
  - `review/`: Ratings and feedback
  - `notification/`: System and email alerts
  - `admin/`: Platform administration and mentor approvals
  - `common/`: Shared response DTOs, exception handler

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
