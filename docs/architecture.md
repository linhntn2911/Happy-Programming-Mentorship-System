# HappyProgramming Architecture Overview

`backend/` is a Spring Boot REST API; `frontend/` is a Vite JavaScript client. `specs/` contains bounded Spec Kit artifacts and `docs/` contains operational guidance.

## Backend: Package Diagram1

Backend packages follow the technical layers defined in `Package Diagram1.docx`, not user roles:

```text
backend/src/main/java/com/happyprogramming/
├── HpmsApplication.java
├── config/
├── constant/
├── controller/
├── dto/
├── entity/
├── repository/
├── service/
├── security/
├── integration/
├── scheduler/
└── utils/
```

Only implemented packages are present. Controllers handle HTTP and delegate to services; services own business rules and transactions; repositories own persistence queries; entities map SQL Server tables; DTOs define API contracts. Configuration, access control, external adapters, timed jobs, constants, and pure helpers use their matching packages. Backend tests mirror production packages. `HpmsApplication` stays at the root so Spring scans its descendants. Moving a class does not change routes, API contracts, schema, or behavior.

## Frontend: flat role folders

```text
frontend/src/roles/{admin,staff,mentor,mentee,auth,guest}/*.js
frontend/src/shared/*.js
frontend/src/main.js
frontend/src/app.css
frontend/src/styles/admin.css
```

Frontend role-owned modules are grouped directly by role, without nested `pages/components/services` folders. Cross-role modules live in `shared`; `shared/apiClient.js` centralizes HTTP behavior. Global design tokens remain in `app.css`, with operational workspace styles in `styles/admin.css`. The frontend convention does not override the backend Package Diagram.
