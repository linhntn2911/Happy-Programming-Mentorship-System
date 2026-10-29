# Feature Specification: Mentor Wallet and Payout Requests

**Feature Branch**: `019-mentor-wallet-payout`  
**Created**: 2026-10-11  
**Status**: Draft

## User Scenarios & Testing

### User Story 1 - View mentor earnings (Priority: P1)

As a mentor, I can see earnings that are held, available to withdraw, reserved by a payout request, and already paid.

**Acceptance Scenarios**:
1. Given a verified SePay payment, when fewer than seven days have elapsed, the mentor sees the net amount as held and cannot withdraw it.
2. Given seven days have elapsed, when the release job runs, the platform fee and mentor share are recorded once in the immutable ledger and the share becomes available.

### User Story 2 - Request a payout (Priority: P1)

As a mentor, I can request a payout up to my available balance and provide destination details securely.

**Acceptance Scenarios**:
1. A payout request reserves its amount so another request cannot spend the same balance.
2. A mentor cannot request a payout greater than their available balance or access another mentor's wallet.
3. Bank account details are encrypted at rest and never returned in the mentor wallet response.

### User Story 3 - Process a payout (Priority: P1)

As an administrator, I can review a payout request, transfer funds outside the application, and record it as paid or reject it.

**Acceptance Scenarios**:
1. Marking a request paid creates one immutable payout ledger entry and requires a transfer reference.
2. Rejecting a request releases its reserved balance.
3. Duplicate decisions cannot create another payout entry.

## Requirements

- **FR-001**: Only verified successful SePay payments fund mentor earnings.
- **FR-002**: Each payment is held for seven full 24-hour periods after `paid_at`.
- **FR-003**: Platform commission uses the payment's commission snapshot; the rest is the mentor share.
- **FR-004**: Release and payout operations are idempotent and append-only.
- **FR-005**: Mentors may request withdrawals only from released, unreserved balances.
- **FR-006**: Only administrators may record payout completion or rejection.
- **FR-007**: Destination bank account information is encrypted using a separately configured application key.
- **FR-008**: The system does not initiate bank transfers; an administrator performs the transfer and records its reference.

## Assumptions

- Bank transfers settle funds to the configured HappyProgramming receiving account under an arrangement that permits marketplace collection and later payouts. This is an operational/contractual prerequisite, not guaranteed by this feature.
- The seven-day timer starts at verified SePay `paid_at`.
- Refund/dispute workflows remain authoritative and must not be bypassed by this wallet feature.


## Operational policy amendment (2026-10-23)
Feature 029 supersedes the fixed seven-day hold for newly verified payments: snapshot the Admin-configured 1–90-day hold at settlement. Historical payments retain seven days. Withdrawals must exceed the configured threshold (at least 10,000 VND). A fixed fee is disclosed and snapshotted; the wallet debits gross, and the external transfer equals gross minus fee. Existing requests retain their fee.

## Two-stage payout amendment (2026-10-28)
Feature 031 supersedes prior single-step payout permissions: active Staff reviews REQUESTED and sets APPROVED or REJECTED; active Admin pays/rejects only APPROVED. Both open statuses reserve gross funds. Approval and final-decision metadata remain separate. Admin cannot approve or skip review; Staff cannot mark PAID; approver cannot settle the same request. External bank transfer goes directly from the platform account to mentor.
