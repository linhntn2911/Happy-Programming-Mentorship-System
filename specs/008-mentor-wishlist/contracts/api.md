# Wishlist API contract

## `GET /api/wishlists`

Requires an authenticated active mentee session.

```json
{
  "mentorSlugs": ["minh-an", "thao-linh"]
}
```

## `PUT /api/wishlists/{mentorSlug}`

Requires an authenticated active mentee session. Saves the public mentor and returns:

```json
{ "mentorSlug": "minh-an", "saved": true }
```

## `DELETE /api/wishlists/{mentorSlug}`

Requires an authenticated active mentee session. Removing an absent entry succeeds and returns `saved: false`.
