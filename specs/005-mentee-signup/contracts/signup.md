# Mentee Signup Contract

## Endpoint

`POST /api/auth/signup/mentee`

### Request Body (JSON)

| Field | Type | Rules |
| --- | --- | --- |
| `firstName` | String | Required, trimmed, 1-75 chars |
| `lastName` | String | Required, trimmed, 1-75 chars |
| `email` | String | Required, valid email format, max 254 chars |
| `password` | String | Required, min 8 chars, max 72 bytes, must have lowercase and uppercase |

### Headers
- `Content-Type: application/json`
- `X-CSRF-TOKEN`: token from `/api/auth/csrf`

### Success Response (200 OK / 201 Created)
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "id": 12,
    "name": "Jane Doe",
    "email": "jane.doe@example.com",
    "role": "MENTEE"
  }
}
```
Header: `Set-Cookie: JSESSIONID=...; Path=/; HttpOnly; SameSite=Lax`

### Error Responses
- **400 Bad Request**: Invalid inputs (e.g. password too short, invalid email)
```json
{
  "success": false,
  "message": "Password must be at least 8 characters and include both uppercase and lowercase letters."
}
```
- **409 Conflict**: Email already registered
```json
{
  "success": false,
  "message": "An account with this email address already exists. Please log in instead."
}
```
