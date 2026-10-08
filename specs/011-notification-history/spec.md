# Notification history

## Scope and outcomes

Signed-in users can open a full notification history from the existing bell. They can see all or unread notifications, move between pages, mark one or all as read, and follow a valid in-app action link. The bell remains a short preview. Notification producers from future business flows are outside this change.

## Acceptance

1. History returns only the authenticated user's notifications, newest first, with stable ordering and total counts.
2. Unread filtering and pagination operate on the server, so records beyond the bell's first 50 remain accessible.
3. Empty, loading, error, and no-unread states are distinct; retry is available after an error.
4. Marking a notification read refreshes the page and bell count; an action link only navigates to a safe internal route.
5. The existing bell response and read endpoints remain compatible.
