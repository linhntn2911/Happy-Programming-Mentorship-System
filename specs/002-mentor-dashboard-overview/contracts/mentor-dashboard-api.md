# Mentor Dashboard API Contract

All responses use the existing `ApiResponse` envelope. Mentor identity is resolved on the server; clients must not submit a mentor ID.

## `GET /api/mentors/me/dashboard`

Returns the current mentor's overview in one response.

### Success (`200`)

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "summary": {
      "netEarnings": 0.00,
      "currency": "VND",
      "pendingInvitations": 0,
      "averageRating": null,
      "reviewCount": 0
    },
    "incomingRequests": [],
    "systemNotices": []
  },
  "timestamp": "2026-10-07T00:00:00Z"
}
```

Request items contain `id`, `menteeName`, `packageName`, `learningGoals`, `learningGoalsSummary`, `status`, `submittedAt`, and `responseDeadline`. `packageName` is the current linked offering label, not the immutable request-time package snapshot. Requests are `PENDING`; elapsed requests remain visible with actions disabled until the expiry job updates their status.

Notices contain `id`, `type` (`CANCELLATION` or `REFUND`), nullable `requestId`, `menteeName`, current `status`, `occurredAt`, nullable `completedAt`, and safe `message`. Cancellation summaries use the persisted cancellation time; refund summaries use `requested_at` and show `completed_at` only when successful. These are current-state summaries, not a status-change event history. The list is newest-first and capped at 10.

### Errors

- `503`: local demo identity disabled/unconfigured, or persistence unavailable; generic error envelope without SQL/vendor details.
- `404`: no active mentor account/profile for the configured local identity.

## `PUT /api/mentors/me/requests/{requestId}/decision`

Accepts or rejects one request owned by the current mentor before its UTC response deadline.

### Request

```json
{
  "decision": "ACCEPTED"
}
```

`decision` must be `ACCEPTED` or `REJECTED`.

### Success (`200`)

Returns the updated decision result in `data`:

```json
{
  "success": true,
  "message": "Mentorship request accepted.",
  "data": {
    "requestId": 123,
    "status": "ACCEPTED",
    "respondedAt": "2026-10-07T00:00:00Z"
  },
  "timestamp": "2026-10-07T00:00:00Z"
}
```

Accepting does not create a payment, subscription, escrow entry, or workspace. The mentee uses the existing checkout step after acceptance.

### Errors

- `400`: missing/unsupported decision or invalid request ID.
- `404` or opaque `409`: no eligible owned request was transitioned; the response must not reveal another mentor's request.
- `503`: identity or persistence unavailable.

Failed updates do not change request state.
