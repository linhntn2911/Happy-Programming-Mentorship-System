# Tasks

- [x] Read repository guidance, baseline specification, SRS application/payment requirements, and current request/notification/checkout paths.
- [x] Specify mentee application management, ownership, filtering, pagination, and accepted-only payment navigation.
- [x] Record API contract and payment integration boundary.
- [x] Add owner-scoped paginated backend list endpoint and focused controller test.
- [x] Add mentee applications page, filters, pagination, account menu link, and route.
- [x] Point new and existing mentorship request notifications to the applications page and update email copy.
- [x] Run the frontend test suite and production build; verify the diff formatting.
- [ ] Run the focused backend controller test and validate the SQL-backed list query against SQL Server.

## Verification note

Frontend verification passes. The backend test could not start because the checked-in Maven Wrapper fails in its PowerShell bootstrap (`Cannot index into a null array`) before Maven starts; there is no system Maven command. SQL Server and VNPay are not configured in this environment, so the SQL query and real payment callback remain unverified here.
