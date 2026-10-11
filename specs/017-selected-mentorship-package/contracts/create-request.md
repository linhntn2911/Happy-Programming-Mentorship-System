# Create mentorship request package contract

`POST /api/mentorship-requests` accepts the existing mentorship application fields plus:

```json
{
  "mentorSlug": "mentor-linh",
  "serviceOfferingId": 101,
  "learningGoals": "...",
  "experienceLevel": "JUNIOR",
  "termsVersion": "v1"
}
```

`serviceOfferingId` identifies the package selected in the mentor profile. The backend verifies that it is an active `MONTHLY` offering owned by the mentor resolved from `mentorSlug`; amount and package terms are always loaded by the server. An unknown, inactive, or foreign ID returns `409 Conflict`. When the ID is omitted, the request is accepted only if exactly one active monthly offering exists; multiple offerings return `400 Bad Request` and require the client to select a package.
