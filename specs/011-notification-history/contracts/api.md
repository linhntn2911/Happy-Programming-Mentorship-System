# Notification history API

`GET /api/notifications/history?page=0&size=10&unreadOnly=false`

Requires an authenticated session. `page` is zero-based, `size` is 1–50, and `unreadOnly` is boolean. Invalid bounds return 400. Response uses the existing `ApiResponse` envelope:

```json
{"data":{"unreadCount":2,"totalElements":27,"totalPages":3,"page":0,"size":10,"notifications":[{"id":1,"title":"Example","message":"Text","type":"TEST","actionUrl":"#/account","read":false,"createdAt":"2026-10-08T10:00:00"}]}}
```

The other notification endpoints are unchanged.
