# Implementation Plan: 014-forgot-password

**Branch**: `014-forgot-password` | **Date**: 2026-10-11 | **Spec**: [spec.md](file:///d:/Project/Happy-Programming-Mentorship-System/specs/014-forgot-password/spec.md)

---

## 1. Summary

Implement the self-service "Forgot Password" & "Reset Password" workflow for HappyProgramming. Enables any registered user (Mentee, Mentor, Staff, Admin) to request a 15-minute 6-digit verification code sent to their registered email address, verify the code, and set a new password complying with security standards. Uses the existing immutable table `dbo.security_tokens` with `purpose = 'RESET_PASSWORD'`, prevents account enumeration, invalidates codes upon single use, resets temporary login lockouts, and delivers an accessible split-screen UI.

---

## 2. Technical Context

- **Language / Framework**: Java 17, Spring Boot 3.5.x, Maven.
- **Frontend**: Vite 6, Tailwind CSS 4, Vanilla Modular JavaScript.
- **Database**: Microsoft SQL Server (`dbo.users`, `dbo.security_tokens`).
- **Integrations**: Gmail SMTP via `JavaMailSender` (`spring-boot-starter-mail`).
- **Security**: BCrypt password hashing, SHA-256 token hashing, Spring Security session management, anti-enumeration timing safety.
- **Testing**: Backend `MockMvc` integration tests (`mvnw.cmd test`), Frontend test suite (`npm test`).

---

## 3. Constitution Check

- [x] **I. Specification Traceability**: Feature specified in `specs/014-forgot-password/spec.md`, tracked via numbered spec directory and structured tasks.
- [x] **II. Application Boundaries**: Layered architecture followed (`controller`, `service`, `dto`, `entity`, `repository`). DTOs with Bean Validation (`ForgotPasswordRequest`, `ResetPasswordRequest`). Frontend grouped under `roles/auth/` and `shared/`.
- [x] **III. Data Integrity & Security**: Baseline `docs/database/init/schema_31_tables.sql` remains **IMMUTABLE**. Table `dbo.security_tokens` natively supports `purpose = 'RESET_PASSWORD'`. 15-minute expiration strictly enforced. Passwords hashed via BCrypt. Anti-enumeration protects privacy.
- [x] **IV. Consistent & Accessible UI**: Reuses `TextInput`, `Button`, `auth.css`, and split-screen branding layout with brand purple `#8b46e8` and cream `#fbf9ff`. English user-facing copy.
- [x] **V. Evidence-Based Completion**: Endpoints validated with MockMvc tests; frontend verified with build and unit tests.

---

## 4. Architecture & Interface Design

### 4.1 Backend Architecture
1. **DTOs**:
   - `ForgotPasswordRequest`: `email` (@NotBlank, @Email, max 254 chars).
   - `ResetPasswordRequest`: `email` (@NotBlank, @Email), `code` (@NotBlank, 6 digits), `newPassword` (@NotBlank, min 8 chars).
2. **Entity Updates**:
   - `SecurityToken`: add static factory `createResetPassword(Long userId, String code, LocalDateTime now, int expiryMinutes)`.
   - `User`: add domain method `resetPassword(String newPasswordHash, LocalDateTime now)`.
3. **Repository**:
   - `SecurityTokenRepository`: existing queries find active token by `userId`, `purpose = 'RESET_PASSWORD'`, and `usedAt IS NULL`.
4. **Service (`AuthService`)**:
   - `forgotPassword(ForgotPasswordRequest)`: Normalize email. If user exists and is active, generate 6-digit OTP, persist hashed token in `security_tokens`, dispatch email via `EmailService.sendPasswordResetOtpEmail(...)`. If user does not exist, return silently to prevent enumeration.
   - `resetPassword(ResetPasswordRequest)`: Validate password strength policy. Find user and pending `RESET_PASSWORD` token. Validate match & TTL. Update `user.resetPassword(...)` with BCrypt hash, call `token.markUsed(now)`.
5. **Controller (`AuthController`)**:
   - `POST /api/auth/forgot-password`: calls `authService.forgotPassword`, returns `200 OK` with generic success message.
   - `POST /api/auth/reset-password`: calls `authService.resetPassword`, returns `200 OK` with success message.
6. **Security Config (`SecurityConfig`)**:
   - Explicitly permit `POST /api/auth/forgot-password` and `POST /api/auth/reset-password` without authentication.

### 4.2 Frontend Architecture
1. **Components**:
   - `ForgotPasswordForm.js`: Step 1 (enter email), Step 2 (enter 6-digit code + new password + confirm password).
   - `ForgotPasswordPage.js`: Mounts form inside `AuthShell` with online mentorship visual.
2. **Service (`authService.js`)**:
   - `forgotPassword({ email })`
   - `resetPassword({ email, code, newPassword })`
3. **Navigation & Links**:
   - Update `LoginForm.js`: Link "Forgot password?" directly to route `#/forgot-password`.
   - Update `main.js`: Register route `#/forgot-password`.
   - Link back to `#/login` upon success or user cancellation.

---

## 5. Directory & File Manifest

```text
backend/src/main/java/com/happyprogramming/
├── controller/AuthController.java               # Add /forgot-password & /reset-password endpoints
├── dto/ForgotPasswordRequest.java              # New DTO
├── dto/ResetPasswordRequest.java               # New DTO
├── entity/SecurityToken.java                   # Add createResetPassword factory
├── entity/User.java                            # Add resetPassword helper
├── service/AuthService.java                    # Add forgotPassword & resetPassword logic
├── service/EmailService.java                   # Add sendPasswordResetOtpEmail
└── security/SecurityConfig.java                # Verify permitAll for endpoints

frontend/src/
├── roles/auth/ForgotPasswordForm.js            # Form component (Step 1 & 2)
├── roles/auth/ForgotPasswordPage.js            # Page component with AuthShell
├── roles/auth/authService.js                   # Client API calls
├── roles/auth/LoginForm.js                     # Update Forgot password link
└── main.js                                     # Route mapping
```
