# Unified Mentor Bookings

## Goal

Give mentors one Bookings page for monthly mentorship applications and one-off session orders. Monthly applications keep their approval step. One-off sessions never expose mentor approval controls and become scheduled bookings only after verified payment.

## Requirements

- The mentor navigation, breadcrumb, page heading, and primary route use **Bookings**.
- The page lists both `MONTHLY` and `ONE_OFF` records and supports status and type filters.
- A pending monthly application displays its 48-hour response deadline and permits Accept or Decline from its details dialog.
- An accepted but unfunded monthly application or one-off order displays `Awaiting payment`.
- A funded one-off order displays the persisted booking lifecycle and scheduled start/end time.
- One-off details display session count and participant count and never display Accept or Decline actions.
- Missing deadlines or schedules display an em dash; epoch dates must not be fabricated.
- Existing request URLs and APIs remain available for compatibility while new navigation uses the booking URL and API.

## Acceptance scenarios

1. A mentor opens Bookings and can filter between Monthly and One-off session records.
2. A pending monthly row opens a details dialog with Accept and Decline controls.
3. A one-off order awaiting payment has no mentor decision controls.
4. After a verified one-off payment creates booking rows, the mentor sees the booking as Upcoming with its complete scheduled range.
5. Legacy cancelled records with no deadline display `—`.
