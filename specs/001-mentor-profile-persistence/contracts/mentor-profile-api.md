# Mentor Profile API Contract

All successful responses use the existing envelope:

```json
{
  "success": true,
  "message": "Success",
  "data": {},
  "timestamp": "2026-10-07T00:00:00Z"
}
```

## GET `/api/mentors/me/profile`

Resolves the mentor from the server's explicitly enabled local-demo identity. The request does not accept a mentor/user ID.

`200 OK` data:

```json
{
  "userId": 123,
  "fullName": "Mentor Example",
  "biography": "At least fifty characters describing the mentor's professional background and approach.",
  "yearsExperience": 6.0,
  "githubUrl": "https://github.com/example",
  "linkedinUrl": "https://www.linkedin.com/in/example",
  "portfolioUrl": "https://example.dev",
  "skills": [
    {
      "skill": {
        "id": 1,
        "categoryId": 1,
        "name": "Java",
        "slug": "java",
        "description": null
      },
      "yearsExperience": null,
      "verified": false,
      "displayOrder": 0
    }
  ]
}
```

Only active skill rows are included. Missing demo configuration fails closed with `503 Service Unavailable`; configured but missing, inactive, locked, or non-mentor accounts fail with `404 Not Found`.

## PUT `/api/mentors/me/profile`

Atomically updates mutable user/profile fields and the complete teaching-skill selection.

Request:

```json
{
  "fullName": "Mentor Example",
  "biography": "At least fifty characters describing the mentor's professional background and approach.",
  "yearsExperience": 6.0,
  "githubUrl": "https://github.com/example",
  "linkedinUrl": "https://www.linkedin.com/in/example",
  "portfolioUrl": "https://example.dev",
  "skillIds": [1, 2]
}
```

- `fullName`: required, maximum 150 characters.
- `biography`: required, trimmed length 50–1000 characters, stored in both `users.bio` and `mentor_profiles.biography`.
- `yearsExperience`: required, range 0–80, at most one decimal place.
- External URLs: optional; blank clears a URL; non-empty values must use HTTP or HTTPS and be at most 500 characters.
- `skillIds`: required, non-empty, unique list of positive IDs referring only to active skills.
- Approval, publication, verification, ownership IDs, profile slug, and prices are not writable through this request.

`200 OK` returns the updated profile response shown for GET. Validation/selection errors return `400 Bad Request` and must not partially update rows.

## GET `/api/skills?active=true`

Lists active staff-managed skill tags sorted by name. `active` may be omitted (defaults to active); `active=false` is rejected with `400 Bad Request` because this endpoint is intentionally active-only.

`200 OK` data:

```json
[
  {
    "id": 1,
    "categoryId": 1,
    "name": "Java",
    "slug": "java",
    "description": null
  }
]
```

## Local demo guard

`/api/mentors/me/profile` is available only if `MENTOR_DEMO_ENABLED=true` and `MENTOR_DEMO_USER_ID` is a positive existing mentor user ID. The backend does not accept a client-controlled identity. This is not an authentication mechanism and must not be enabled in deployed environments.

## Excluded

SRS UC10/UC11 do not define profile hourly pricing or service-offering editing. Prices remain represented by existing `service_offerings` records (`MONTHLY`/`ONE_OFF`) and are not part of these routes.
