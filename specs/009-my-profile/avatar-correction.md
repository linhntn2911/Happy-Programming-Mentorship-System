# Avatar and public rating correction

Observed: mentor catalog assigns stock portraits by user ID and a 5.0 rating with zero reviews. Profile upload needs persistence and display verification.

Scope: preserve account photo ownership, show the new photo in the signed-in account menu, keep the existing illustrative mentor portraits and homepage skill rail, and calculate public ratings from published DB reviews. No schema or seed changes.

Plan: reuse files/avatar_content and users/avatar_file_id; refresh the account-menu photo from the private profile API on page mount and after upload or removal. A dedicated public mentor avatar read checks public profile, owner, and READY file status. Public cards retain illustrative portraits; zero reviews display “No reviews yet”. Keep private account avatar endpoint and CSRF-protected uploads. Validate profile upload/reload/remove via existing integration test, plus frontend rendering tests and build.

Verification: ProfileControllerTest passed against local SQL Server (5 tests, including public visibility and zero-review regression) before the illustrative catalog was restored. The subsequent backend rerun was blocked because Maven could not resolve its cached Spring Boot parent and network access was denied. Frontend build and focused avatar/card tests pass. Browser-specific upload failure has not been reproduced. Account photo load errors show feedback. The illustrative catalog and homepage skill rail remain available.
