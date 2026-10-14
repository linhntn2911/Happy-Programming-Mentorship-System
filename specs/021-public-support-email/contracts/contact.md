# Contact contract

GET /api/public/contact requires no authentication. 200: standard ApiResponse envelope with data containing only {"supportEmail":"help@example.com"}. Empty string means contact unconfigured; do not display a mailto link. Header Cache-Control: no-store. Missing row is unconfigured; malformed configuration or database failure returns 503 with a generic ApiResponse.error message. No other configuration fields are exposed. Non-GET methods are not publicly permitted.

PUT /api/admin/settings retains its existing contract, ADMIN check, CSRF, required reason and atomic audit. supportEmail is trimmed before validation and storage; blank remains allowed. Commission rate must still be submitted, as before. Public contact does not send messages.
