# Configurable public support email

## Outcome
An administrator can save or clear the platform support email with a reason. Visitors can contact that address from the shared website footer without signing in. Existing settings configuration and audit behavior remain compatible.

## Acceptance scenarios
1. Save a valid email in Admin settings; reload settings and a public page; both show the saved address.
2. Surrounding whitespace is trimmed. Invalid email or missing reason is rejected before persistence.
3. Clearing the email hides the public contact entry on the next page mount/reload.
4. Guests can read only the contact address, never commission configuration, credentials or audit data. Admin writes still require ADMIN authorization and CSRF.
5. Loading has a readable state. Request failure shows a retry control, not a fabricated contact address. Detached views ignore late responses.

## Clarifications
Support email is a public contact address, not SMTP configuration or a mail-sending feature. Preserve the existing optional/blank-address behavior. Existing settings endpoint continues accepting both commissionRate and supportEmail; no financial behavior changes. Refresh/remount is the cross-client freshness boundary, not live push.
