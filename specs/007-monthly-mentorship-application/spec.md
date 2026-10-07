# Monthly mentorship application draft

## Scope
From an approved mentor profile, a mentee can open a three-step monthly mentorship application. This iteration is a client-only draft: it must not call a request API, notify the mentor, create a payment, or write a mentorship request to SQL Server.

## User outcomes
- The page identifies the selected mentor and keeps the monthly plan context.
- Step 1 asks for the mentorship goal, step 2 asks for the goal timeline, and step 3 collects a 1–1000 character message.
- Back and Next preserve selections. The final action saves the draft locally and clearly says it has not been sent.
- Refreshing restores the current draft for the selected mentor during the browser session.
- English copy and the existing purple/white design system.

## Out of scope
Submitting to a mentor, email/notification, approval status, payment, subscription, server persistence, chat, and backend/database changes.

## Acceptance criteria
1. apply/monthly?mentor=<id> opens with a safe mentor display name.
2. One step is visible at a time and progress reflects the current step.
3. Next is disabled until a choice/message is valid; the message counter remains 0–1000.
4. Completing the wizard never issues an HTTP request and shows a draft-only confirmation.
