# Mentorship Workspace API

All endpoints require an authenticated session. Mutations require the normal CSRF token.

## List active workspaces

`GET /api/mentorship-workspaces`

Returns active or trialing monthly subscriptions where the current user is the assigned mentor or mentee.
Each summary includes `unreadCount`, calculated from the role-specific last-read message pointer.

## Read workspace

`GET /api/mentorship-workspaces/{subscriptionId}`

Returns subscription context and the latest 100 messages in chronological order. Returns `403` when the authenticated user is not a member and `404` when no active workspace exists.

## Send message

`POST /api/mentorship-workspaces/{subscriptionId}/messages`

```json
{
  "clientMessageKey": "71bb8930-9074-4c29-84ef-03af58b8d605",
  "messageType": "TEXT",
  "body": "Could you review my service layer design?",
  "codeLanguage": null
}
```

`messageType` is `TEXT` or `CODE`. The same sender and client key return the existing message.

The current web composer sends `TEXT`; existing `CODE` records remain supported when reading history.

## Upload file

`POST /api/mentorship-workspaces/{subscriptionId}/files`

Multipart fields: `clientMessageKey` and `file`. Maximum size is 10 MB. Returns a `FILE` workspace message.

## Download file

`GET /api/mentorship-workspaces/{subscriptionId}/messages/{messageId}/file`

Returns the attachment only after validating that the current user belongs to the active subscription and that the message belongs to its approved conversation.

## Mark conversation as read

`POST /api/mentorship-workspaces/{subscriptionId}/read`

Moves only the authenticated member's last-read pointer to the latest message in that conversation. The mutation requires CSRF protection.
