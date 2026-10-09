# HappyProgramming Architecture Overview

`backend/` is a Spring Boot REST API; `frontend/` is a Vite JavaScript client. `specs/` contains bounded Spec Kit artifacts and `docs/` contains operational guidance.

## Role layout

Both applications group role-owned code in flat role folders. `admin`, `staff`, `mentor`, `mentee`, `auth`, and `guest` (frontend only) own their flows. Reusable cross-role code belongs in `shared`; backend configuration and security remain in `config` and `security`.

```text
frontend/src/roles/{admin,staff,mentor,mentee,auth,guest}/*.js
frontend/src/shared/*.js
frontend/src/main.js
frontend/src/app.css
frontend/src/styles/admin.css

backend/src/main/java/com/happyprogramming/role/{admin,staff,mentor,mentee,auth,shared}/*.java
backend/src/test/java/com/happyprogramming/role/{admin,staff,mentor,mentee,auth,shared}/*Test.java
backend/src/main/java/com/happyprogramming/{config,security}/*.java
backend/src/main/java/com/happyprogramming/HpmsApplication.java
```

There are no `pages/components/services` subfolders within a role. Class responsibility remains explicit: controllers delegate to services, services own business rules and use repositories, DTOs define API contracts, and entities map persistence. Moving a file must preserve routes, exports, API paths, and database behavior. The role-folder layout supersedes the old physical package arrangement in `Package Diagram1.docx` and `specs/003-package-alignment`; it does not change the layer responsibilities described there.

The client uses shared design tokens in `app.css` and shared operational workspace styles in `styles/admin.css`. HTTP behavior is centralized in `shared/apiClient.js` with role-specific service modules.
