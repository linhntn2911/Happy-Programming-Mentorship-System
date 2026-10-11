# Tasks: 014-forgot-password

Ordered, verifiable implementation tasks for the Forgot Password feature:

- [x] **Task 1: Backend DTOs & Entity Helpers**
  - Create `com.happyprogramming.dto.ForgotPasswordRequest` with email validation.
  - Create `com.happyprogramming.dto.ResetPasswordRequest` with email, code, and newPassword validation.
  - Add `SecurityToken.createResetPassword(userId, code, now, expiryMinutes)` helper.
  - Add `User.resetPassword(passwordHash, now)` helper.

- [x] **Task 2: EmailService Password Reset Dispatch**
  - Add `sendPasswordResetOtpEmail(email, recipient, code)` in `EmailService`.

- [x] **Task 3: AuthService & AuthController Implementation**
  - Implement `AuthService.forgotPassword(request)` with anti-enumeration protection and 15-minute token TTL.
  - Implement `AuthService.resetPassword(request)` validating code, TTL, single-use, password policy, and clearing lockout counters.
  - Implement `POST /api/auth/forgot-password` and `POST /api/auth/reset-password` in `AuthController`.
  - Ensure `SecurityConfig` permits these endpoints without authentication.

- [x] **Task 4: Backend Unit & Integration Tests**
  - Create `ForgotPasswordIntegrationTest` verifying successful flow, anti-enumeration, expired token rejection, and invalid password policy rejection.

- [x] **Task 5: Frontend Service & Components**
  - Add `forgotPassword` and `resetPassword` methods to `frontend/src/roles/auth/authService.js`.
  - Implement `frontend/src/roles/auth/ForgotPasswordForm.js` (Step 1 email entry, Step 2 code & new password entry, resend code button, eye toggle).
  - Implement `frontend/src/roles/auth/ForgotPasswordPage.js` inside `AuthShell`.

- [x] **Task 6: Frontend Routing & Navigation Integration**
  - Update `LoginForm.js` to link "Forgot password?" to `#/forgot-password`.
  - Register `#/forgot-password` route in `frontend/src/main.js`.
  - Test and verify build with `npm run build && npm test`.
