# Mentee self-registration

Enable prospective mentees to register for an account using first name, last name, email, and password, persisting directly to SQL Server `dbo.users` and automatically logging in upon successful creation.

## User Outcomes
- A visitor can navigate from the login page or direct route to "Sign up as a mentee".
- The visitor sees the same split-screen branding layout (mentorship imagery on the left, clean form on the right).
- The visitor provides First name, Last name, Email, and a password complying with security guidelines.
- The system validates input, checks for email duplicates, hashes the password via BCrypt, inserts a new `dbo.users` record with role `MENTEE` and status `ACTIVE`, creates a server session, and redirects to their account dashboard.
- If the email is already registered, the visitor receives a clear error advising them to log in instead.
- If Google SSO is enabled, the visitor can initiate Google sign-up.

## Acceptance Criteria
- Form fields: First name, Last name, Email address, Password (with toggle show/hide).
- Password rules: minimum 8 characters, at least 1 lowercase letter, at least 1 uppercase letter, not trivial/common.
- Server validation: Bean Validation annotations on DTO, BCrypt maximum 72 UTF-8 bytes constraint.
- Database persistence: `dbo.users` receives `first_name`, `last_name`, `full_name`, `email`, `password_hash`, `role_code = 'MENTEE'`, `status = 'ACTIVE'`, and timestamps.
- Duplicate email handling: Rejects duplicate emails with HTTP 409 / 400 and user-friendly error without disclosing sensitive details.
- Post-signup session: Establishes HTTP session identically to `POST /api/auth/login` and redirects to `#/account`.
- Navigation: Clicking "Sign up as a mentee" on the Login page navigates directly to `#/signup/mentee`. "Log in" on the signup page returns to `#/login`.
