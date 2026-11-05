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

As Staff, I can validate and approve or reject a mentor payout request. As an administrator, I can process an approved request, transfer funds outside the application, and record the result with transfer evidence.

**Acceptance Scenarios**:
1. Staff can approve or reject only `REQUESTED` payouts; approval forwards the request to Admin.
2. Admin can process only `APPROVED` payouts and must provide a transfer reference and receipt image before marking one `PAID`.
3. Rejecting a request releases its reserved balance.
4. Duplicate decisions cannot create another payout entry.
5. The mentor receives status notifications and can open the transfer receipt for a paid payout.

## Requirements

- **FR-001**: Only verified successful SePay payments fund mentor earnings.
- **FR-002**: Each payment is held for seven full 24-hour periods after `paid_at`.
- **FR-003**: Platform commission uses the payment's commission snapshot; the rest is the mentor share.
- **FR-004**: Release and payout operations are idempotent and append-only.
- **FR-005**: Mentors may request withdrawals only from released, unreserved balances.
- **FR-006**: Staff may approve or reject requested payouts but cannot record payment. Only administrators may transfer and mark approved payouts paid.
- **FR-007**: Destination bank account information is encrypted using a separately configured application key.
- **FR-008**: The system does not initiate bank transfers; an administrator performs the transfer and records its reference.
- **FR-009**: Marking a payout paid requires a PNG, JPG, or WEBP receipt no larger than 5 MB; only the owning mentor may retrieve it.

## Assumptions

- Bank transfers settle funds to the configured HappyProgramming receiving account under an arrangement that permits marketplace collection and later payouts. This is an operational/contractual prerequisite, not guaranteed by this feature.
- The seven-day timer starts at verified SePay `paid_at`.
- Refund/dispute workflows remain authoritative and must not be bypassed by this wallet feature.


## Operational policy amendment (2026-10-23)
Feature 029 supersedes the fixed seven-day hold for newly verified payments: snapshot the Admin-configured 1–90-day hold at settlement. Historical payments retain seven days. Withdrawals must exceed the configured threshold (at least 10,000 VND). A fixed fee is disclosed and snapshotted; the wallet debits gross, and the external transfer equals gross minus fee. Existing requests retain their fee.
