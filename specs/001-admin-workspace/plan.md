# Implementation plan

Integration amendment (2026-10-07): specs/009-admin-auth-integration supersedes the separate admin login and old package decisions below. Admin uses shared /api/auth sessions and layered com.happyprogramming packages. Earlier sections record the original implementation context; unresolved SRS gaps remain outside this merge.

Use the existing Vite ES modules and Tailwind 4 tokens. Introduce an admin layout, small reusable table/stat/status/notice primitives, and page modules composed from existing Button, Dialog, Badge and EmptyState components. Showcase new primitives before using them in screens. Escape all dynamic strings before HTML interpolation.

Use hash routes under `#/admin`, with overview, users, staff, revenue, settings and audit views. Keep all data access behind one admin service boundary. A mounted page owns its event listeners and outstanding async work; cleanup prevents stale renders. Ensure public mentor hydration is isolated from admin routes.

Backend: Spring Security session authentication with BCrypt credentials from the canonical users table, CSRF protection, and fresh active-admin checks per request. Use JDBC repositories with parameterized SQL and transactional services. Existing tables remain authoritative. Flyway baselines the existing schema at version 1 and applies an incremental migration adding audit IP addresses and an immutable audit trigger. Do not run the destructive/fresh-only schema script automatically. Account status, staff permissions and settings updates write audit records in the same transaction. Revenue filters SUCCEEDED VNPay payments with a gateway transaction ID and paid timestamp, using original commission snapshots. Store UTC; display dates explicitly in UTC.

The admin login is scoped to this workspace, not a replacement for future mentor/mentee authentication. No production account is seeded. Live mode requires an existing active ADMIN with a BCrypt hash and the canonical database. Demo mode is explicitly selected and persists only sample state in this browser. Existing purple/white brand, Be Vietnam Pro typography, Georgia headings and component sizing remain authoritative.

Verification: real frontend behavior tests, production build, browser navigation/mutations, mobile 320px/tablet/desktop, keyboard and async states. Backend tests are required if backend changes are selected. Record unavailable checks honestly.

## Integration with linh (2026-10-06)
Merge commit 0de9be7 into the current local checkout and reapply preserved admin work. Keep linh's homepage, mentor directory, filters, API DTOs and tests. Compose admin routes with its router and prevent public catalog hydration from replacing the admin page. Keep a pre-merge Git stash until the integrated result is reviewed. No remote push is requested.

Follow the merged database policy: the immutable baseline is untouched; the new idempotent audit migration is documented in docs/database/migration/20261006_admin_audit_integrity.sql and executed through Flyway V2. For local preview use an available loopback backend port and VITE_API_PROXY_TARGET for the frontend; do not terminate unrelated listeners. Verify backend tests, frontend tests/build, API proxy, homepage and mentor search in the browser.
