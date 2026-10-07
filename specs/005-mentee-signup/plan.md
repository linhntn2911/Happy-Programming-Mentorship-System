# Plan: Mentee Self-Registration

## Architecture & Boundaries
1. **Database**:
   - Versioned migration: `docs/database/migration/20261006_add_user_first_last_name.sql` adds `first_name NVARCHAR(75) NULL` and `last_name NVARCHAR(75) NULL` to `dbo.users`.
   - `full_name` is set to `(firstName + " " + lastName).trim()`, satisfying `CK_users_name`.
   - `role_code` is set to `'MENTEE'`, `status` to `'ACTIVE'`.
   - `password_hash` stores BCrypt hash with cost factor 12.

2. **Backend**:
   - `SignupRequest`: DTO with Bean Validation (`firstName`, `lastName`, `email`, `password`).
   - `UserRepository`: query to check if normalized email already exists (`existsByEmailNormalized` or `findByEmailNormalized`).
   - `AuthService`: `signupMentee(SignupRequest)` checks for duplicate email, hashes password, saves `User`, records login time, returns `AuthenticatedUser`.
   - `AuthController`: endpoint `POST /api/auth/signup/mentee`. Validates request, delegates to `AuthService.signupMentee`, invokes `SessionLogin.establish(...)`, returns `ApiResponse.ok(user)`.
   - `SecurityConfig`: permits `POST /api/auth/signup/**` anonymously; CSRF required.

3. **Frontend**:
   - `MenteeSignupForm`: Reusable form component following HappyProgramming visual identity.
   - `MenteeSignupPage`: Page mounting the form inside `AuthShell` with the left online-mentorship photograph.
   - `authService.js`: `signupMentee({ firstName, lastName, email, password })` helper.
   - `main.js`: router handles `#/signup` and `#/signup/mentee`.
   - `LoginForm.js`: updates "Sign up as a mentee" to link directly to `#/signup/mentee`.
