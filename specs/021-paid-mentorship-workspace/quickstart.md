# Manual Verification

1. Complete an approval-first monthly request and settle its SePay payment through the authenticated webhook.
2. Sign in as the mentee and open `#/workspace`; confirm the activated subscription is listed.
3. Send a text message and a code message.
4. Sign in as the assigned mentor, open Mentorships in the mentor navigation, and confirm both messages are visible.
5. Reply as the mentor and verify the mentee sees the reply after polling.
6. Sign in as an unrelated account and request the subscription detail; confirm the backend returns `403` without message data.
7. Confirm an accepted but unpaid request does not appear in the workspace list.
