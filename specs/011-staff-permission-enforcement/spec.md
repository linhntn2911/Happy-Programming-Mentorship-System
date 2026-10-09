# Staff permission enforcement
User request: finish Staff permission integration.
All four assigned permissions must gate their corresponding live resource lists. Existing
application decisions/CV must remain protected. Revocation, locking and role removal take
effect in existing sessions. Errors must never become mock data or false empty success.
Staff with no grants can view a dashboard containing only authorized metrics (others null).
Mentor directory uses MENTOR_APPLICATION_MANAGE. Mentee directory uses MENTEE_MANAGE.
Requests and skills lists use their matching permissions. ADMIN retains access.
This bounded change provides missing read-only request/skill views, not new payment-sensitive
request transitions or a complete skill CRUD feature. No schema or credential changes.
Acceptance: each permission independently yields 403 -> 200 -> 403 on grant/revoke; other
permissions never unlock it; disabled/locked/non-staff users denied; anonymous 401; audit persists.
