# Implementation Plan: Mentee Dispute Submission

## Scope

This increment implements only the mentee-facing intake and tracking flow from US-M1 through US-M3. Staff triage, mediation chat, resolution, and refund execution remain outside this increment.

## Backend

- Add `disputes` and `dispute_evidence` through a versioned SQL Server migration.
- Extend booking and subscription status constraints with `DISPUTED`.
- Expose authenticated mentee endpoints to list eligible paid services, submit one dispute with 1–5 validated images, list owned disputes, view an owned dispute, and download owned evidence.
- Submit atomically: lock the target, validate its eligibility and ownership, reject duplicate active disputes, create the dispute and evidence, and change the target status to `DISPUTED`.
- Prevent wallet release while a payment has an active dispute.

## Frontend

- Add `#/disputes` using the existing public account shell and design tokens.
- Show a filterable dispute history table, a submission modal, local image previews, validation, success state, and a read-only detail modal.
- Add “My disputes” to the mentee account menu.

## Security

- Every endpoint requires an authenticated `MENTEE` principal.
- Target ownership, dispute ownership, and evidence ownership are checked server-side.
- Evidence is stored privately and returned only through the authorized download endpoint with `nosniff` and `no-store` headers.
- File extension, declared type, size, and magic bytes are validated.

## Verification

- Focused backend service/controller tests cover role checks, duplicate/eligibility validation, file validation, ownership, and submission.
- Frontend unit tests cover form validation and status filtering.
- Run backend tests and frontend build/test because the change spans schema, security-sensitive APIs, routing, and UI.
