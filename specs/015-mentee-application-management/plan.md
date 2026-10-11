# Plan: Mentee Application Management

## Architecture
- Add a paginated, owner-scoped `GET /api/mentorship-requests/mine` endpoint to the existing mentorship request controller/service.
- Read request, mentor, package snapshot, and latest payment status from existing tables. No schema change is needed.
- Add the page and API client module directly in `frontend/src/roles/mentee/`, register `#/applications`, and expose the link in the mentee account menu.
- Route monthly-request notifications to `#/applications`; the page owns the next action and navigates to `#/checkout?requestId=...` only for accepted unpaid requests.

## Security and compatibility
- Derive mentee identity from the authenticated principal. Never accept a mentee ID from the client.
- Reject unauthenticated and non-mentee requests. Enforce ownership again in the existing checkout info and checkout operations.
- Keep existing route and checkout contracts. Use server-side status filtering and offset pagination.
- No hosted URL is added to notification or email copy.

## Validation
- Focused controller test for endpoint response and pagination/filter parameters.
- Frontend page behavior test for payment eligibility and status rendering, then Vite build.
- Do not run external-service/database integration checks without configured SQL Server/VNPay.

## Observed payment boundary
The repository currently has no VNPay URL signing, callback/IPN controller, or gateway verification adapter. The existing checkout service records a payment as `SUCCEEDED` directly from the browser request. This conflicts with the SRS approval-first and verified-payment requirements. This feature links eligible applications to the existing checkout but does not claim or implement a verified VNPay transaction; the checkout’s current simulated settlement remains a separate payment issue to resolve before real payments.
