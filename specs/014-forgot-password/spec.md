# Feature Specification: Forgot Password & Account Recovery

**Feature Branch / Directory**: `specs/014-forgot-password`  
**Created**: 2026-10-11  
**Status**: Draft  
**Standard**: [GitHub Spec Kit](https://github.com/github/spec-kit) / [AGENTS.md](file:///d:/Project/Happy-Programming-Mentorship-System/AGENTS.md)  
**Input**: "Bây giờ làm cho tôi chức năng forgot password"

---

## 1. Executive Summary & Value

Allows registered users (Mentees, Mentors, Staff, Admin) who forgot their password to securely reset their credentials via their registered email address using a time-limited 6-digit OTP code, without leaking account existence or compromising system security.

---

## 2. User Scenarios & Testing

### User Story 1 - Request Password Reset OTP (Priority: P1)

As a registered user who cannot remember my password,  
I want to submit my registered email address on the Forgot Password page,  
So that I receive a secure, short-lived reset code in my inbox.

**Why this priority**: Without requesting the verification code, password recovery cannot proceed.

**Independent Test**: Can be tested by navigating to `#/forgot-password`, entering an email, submitting the form, and receiving the 6-digit code via email or backend verification token.

**Acceptance Scenarios**:
1. **Given** I am on the login page (`#/login`),  
   **When** I click the "Forgot password?" link,  
   **Then** I am routed to the password recovery page (`#/forgot-password`).
2. **Given** I provide a valid registered email address (`alice@example.com`),  
   **When** I submit the reset request,  
   **Then** the system generates a secure 6-digit OTP, stores its SHA-256 hash in `dbo.security_tokens` with purpose `RESET_PASSWORD` and a 15-minute expiration, dispatches an email via Gmail SMTP, and displays a safe success message: *"If an account is associated with this email, a 6-digit reset code has been sent."*
3. **Given** I enter an unregistered email (`unknown@example.com`),  
   **When** I submit the request,  
   **Then** the system returns the identical success message without revealing that the email does not exist (anti-enumeration protection).

---

### User Story 2 - Complete Password Reset with Code (Priority: P1)

As a user who received a 6-digit reset code,  
I want to enter the code along with my new password,  
So that my password is updated securely and I can log in again.

**Why this priority**: Completes the core value proposition of account recovery.

**Independent Test**: Can be tested by supplying the email, the issued 6-digit code, and a compliant new password, confirming password update in the database, and signing in with the new password.

**Acceptance Scenarios**:
1. **Given** a valid, unexpired code for `alice@example.com` and a compliant new password ($\ge 8$ characters, at least 1 uppercase, at least 1 lowercase),  
   **When** I submit the reset form,  
   **Then** the system updates the BCrypt hash in `dbo.users`, marks the token as used (`used_at = NOW`), clears any failed login lockout counters, and presents a success message with a link to log in.
2. **Given** an expired code ($> 15$ minutes) or an invalid code,  
   **When** I attempt to reset the password,  
   **Then** the system rejects the submission with error *"Invalid or expired verification code. Please request a new one."*
3. **Given** a new password that violates policy ($< 8$ chars or missing upper/lowercase or common password),  
   **When** I submit the form,  
   **Then** the system displays specific inline validation errors and does not alter the password.

---

### User Story 3 - Resend Reset Code (Priority: P2)

As a user who did not receive the email or whose code expired,  
I want to request a new reset code,  
So that I can complete the recovery process without starting over from scratch.

**Acceptance Scenarios**:
1. **Given** I am on the reset code entry step,  
   **When** I click "Resend code",  
   **Then** a fresh 6-digit code is generated and dispatched to the email, resetting the 15-minute TTL.

---

## 3. Edge Cases & Security Rules

- **Anti-Enumeration**: Requesting a reset for a non-existent email must return the same generic success response as for an existing email.
- **Single-Use Tokens (GB-03)**: A reset code can only be used once. Once `used_at` is set, any reuse attempt must fail.
- **Expiry Window (GB-03)**: Reset tokens strictly expire 15 minutes after issuance.
- **Account Lock Reset**: Successful password reset clears `failed_login_count` and `locked_until` so the user is not immediately locked out upon entering their new password.
- **Inactive / Blocked Accounts**: If an account is suspended or not verified, appropriate security notices apply.

---

## 4. Functional Requirements

- **FR-001**: System MUST provide a dedicated route and view (`#/forgot-password`) accessible without authentication.
- **FR-002**: System MUST validate email format on both client and server before processing.
- **FR-003**: System MUST generate a cryptographically random 6-digit numeric OTP code for password resets.
- **FR-004**: System MUST store the SHA-256 hash of the token in `dbo.security_tokens` with `purpose = 'RESET_PASSWORD'` and `expires_at = now + 15 minutes`.
- **FR-005**: System MUST enforce the standard password policy (minimum 8 characters, at least 1 uppercase letter, at least 1 lowercase letter, $\le 72$ bytes, no trivial dictionary passwords).
- **FR-006**: System MUST update the password hash via BCrypt (cost factor 12) upon valid code confirmation.
- **FR-007**: System MUST invalidate the token by populating `used_at` immediately upon successful reset.

---

## 5. Success Criteria

- **SC-001**: Users can complete the full password reset journey in under 3 minutes.
- **SC-002**: 100% of expired ($> 15$ min) or already-used codes are strictly rejected.
- **SC-003**: Zero user account enumeration leakage on the password reset initiation endpoint.
