# Role-based login

Build the supplied login layout without Cloudflare using existing fonts and purple tokens. User confirmed real SQL Server authentication.

## Acceptance
- Mentee/Mentor selection, email/password form, real server session, account summary and logout.
- Reject invalid credentials, wrong role, inactive users and temporary lockouts without disclosing account existence.
- Five consecutive failed passwords lock attempts for 15 minutes; successful authentication resets counters.
- Optional Google OIDC uses existing linked identities only; no automatic registration or email-based linking.
- Accessible desktop web layout with input validation, pending and error states; no passwords in browser storage. Mobile/tablet-specific screen work is out of scope unless explicitly requested.

## Boundaries
Email only because dbo.users has no username. Registration, recovery and complete workspaces are separate flows with honest availability messaging. Google credentials are external configuration; disable that action when absent. Preserve schema init and real records; do not seed credentials.
