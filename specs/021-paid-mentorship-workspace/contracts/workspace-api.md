# Mentorship Workspace API

All endpoints require an authenticated session. Mutations require the normal CSRF token.

## List active workspaces

`GET /api/mentorship-workspaces`

Returns one entry per approved mentor–mentee conversation where the current user is a member and the pair has an active monthly subscription or paid one-off booking. Each summary uses `workspaceId`/`conversationId`, includes nullable current-monthly fields, `upcomingSessionCount`, `nextSessionAt`, and `unreadCount`.

## Read workspace

`GET /api/mentorship-workspaces/{conversationId}`

Returns relationship context, nullable active monthly context, paid one-off booking summaries, and the latest 100 messages in chronological order. One-off summaries retain completed history. A `CONFIRMED` one-off is upcoming only while `endAt` is later than the current instant; ended bookings are returned as `COMPLETED` after the lifecycle job runs. Returns `403` when the authenticated user is not a member and `404` when no qualifying workspace exists.

## Send message

`POST /api/mentorship-workspaces/{conversationId}/messages`

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

`POST /api/mentorship-workspaces/{conversationId}/files`

Multipart fields: `clientMessageKey` and `file`. Maximum size is 10 MB. Returns a `FILE` workspace message.

## Download file

`GET /api/mentorship-workspaces/{conversationId}/messages/{messageId}/file`

Returns the attachment only after validating that the current user belongs to the active subscription and that the message belongs to its approved conversation.

## Mark conversation as read

`POST /api/mentorship-workspaces/{conversationId}/read`

Moves only the authenticated member's last-read pointer to the latest message in that conversation. The mutation requires CSRF protection.
