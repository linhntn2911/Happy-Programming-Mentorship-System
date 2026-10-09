# Implementation Plan: 014-trial-prorated-refund

## 1. Architectural Impact
- **Specs Layer**:
  - Update `specs/SPEC.md`: Reflect the updated US-06 Scenario 2 and Step 7 in the Approval-First Monthly Mentorship State Machine.
- **Frontend Layer**:
  - Update `frontend/src/shared/MentorPricingCard.js`: Change copy from "No charge during trial / zero fees" to "Cancel within 7 days and only pay for days used. Unused days are fully refunded."
- **Data & Backend Layer**:
  - Existing `refunds` table stores `amount` (`DECIMAL(18,2) NOT NULL`, checked `amount > 0`), which natively supports arbitrary prorated refund values.
  - Existing `escrow_ledger_entries` stores ledger movements (`REFUND_OUT`, `RELEASE_OUT`).
  - Prorated formula is implemented in payment/refund services to calculate `refundAmount` and `retainedAmount`.

## 2. Validation
- Frontend: run `cmd.exe /c "npm test"` and `cmd.exe /c "npm run build"`.
- Backend: run `.\mvnw.cmd test`.
