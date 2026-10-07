# Plan

Use Spring Security server sessions, HttpOnly SameSite=Lax cookies, a 30-minute timeout, session fixation protection and CSRF tokens from /api/auth/csrf. Production HTTPS sets SESSION_COOKIE_SECURE=true. Never store passwords/tokens in localStorage.

AuthController delegates to AuthService and repositories in the canonical layered packages. Map existing dbo.users fields and lock a row while checking BCrypt/updating failed_login_count, locked_until, last_login_at and updated_at. Return failure results inside the transaction so failed counters commit. Unknown users use a dummy hash. /me rechecks status/role. Login explicitly rotates session/CSRF and saves SecurityContext.

Optional Google OIDC uses Spring's state/token validation, a requested role stored in the server session, and existing GOOGLE/provider_subject links. No email auto-linking. Disable when credentials absent. Redirect only to fixed local pages. No schema changes or seeds.

LoginForm reuses Button/TextInput and is showcased. LoginPage uses authService/apiClient; headers route to #/login. Late mentor hydration cannot replace login/account. AccountPage implements /me and logout. Registration/recovery are separate unavailable flows, not fake success.

Checks: service rules, MVC CSRF/session and regression tests, and frontend build. Existing AGENTS.md principles are the constitution for this bounded change. Reference: https://docs.spring.io/spring-security/reference/6.5/servlet/authentication/session-management.html
