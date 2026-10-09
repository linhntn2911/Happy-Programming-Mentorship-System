# Auth API

ApiResponse envelope and no-store; never expose password hashes. Access through same-origin proxy.

| Endpoint | Input | Result |
| --- | --- | --- |
| GET /api/auth/csrf | none | token/headerName |
| GET /api/auth/options | none | googleEnabled |
| POST /api/auth/login | JSON email/password/role, CSRF | current user DTO and session, 401 generic rejection, 400 invalid input |
| GET /api/auth/me | session | current DB user DTO or 401 |
| POST /api/auth/logout | session, CSRF | invalidated session |
| POST /api/auth/google | JSON role, CSRF | authorization URL or 503 |
| GET /oauth2/authorization/google | server-side role selection | Google redirect |
| GET /login/oauth2/code/google | OAuth callback | fixed redirect to #/account or #/login?error=google |

Roles: MENTEE, MENTOR. User DTO: id, name, email, role. Requested role never grants privileges. Vite proxies OAuth routes too.
