# Implementation Plan: 015-change-password

**Branch**: `015-change-password` | **Date**: 2026-10-12 | **Spec**: [spec.md](file:///d:/Project/Happy-Programming-Mentorship-System/specs/015-change-password/spec.md)

---

## 1. Summary

Implement the self-service "Change Password" feature for authenticated users in HappyProgramming. Allows any authenticated user (Mentee, Mentor, Staff, Admin) to change their password by confirming their current password and choosing a new password compliant with password security standards.

---

## 2. Technical Context

- **Language / Framework**: Java 17, Spring Boot 3.5.x, Maven.
- **Frontend**: Vite 6, Tailwind CSS 4, Vanilla Modular JavaScript.
- **Database**: Microsoft SQL Server (`dbo.users`). No schema migration needed (uses existing `password_hash` column).
- **Security**: BCrypt password hashing, Spring Security session authentication.
- **Testing**: Backend `MockMvc` tests (`mvnw.cmd test`), Frontend test suite (`npm test`).

---

## 3. Constitution Check

- [x] **I. Specification Traceability**: Documented in `specs/015-change-password/spec.md` with tasks tracked in `tasks.md`.
- [x] **II. Application Boundaries**: Layered architecture followed (`controller`, `service`, `dto`, `entity`, `repository`). DTO with Bean Validation (`ChangePasswordRequest`). Frontend in `roles/auth/` and `shared/`.
- [x] **III. Data Integrity & Security**: Baseline schema remains **IMMUTABLE**. Current password verified with BCrypt. Password policy validated server-side.
- [x] **IV. Consistent UI**: Uses standard design system tokens (brand purple `#8b46e8`, dark purple `#7431d0`, ink `#25143f`, cream `#fbf9ff`, line `#e8e0f1`). English user-facing copy.
- [x] **V. Evidence-Based Verification**: Validated via unit/integration tests and build passes.

---

## 4. Architecture & Interface Design

### 4.1 Backend Architecture
1. **DTO**:
   - `ChangePasswordRequest`: `currentPassword` (@NotBlank), `newPassword` (@NotBlank, @Size(min = 8, max = 72)).
2. **Service (`AuthService`)**:
   - `changePassword(Long userId, ChangePasswordRequest request)`:
     - Load user from `UserRepository` by `userId`.
     - Check `user.getPasswordHash()` exists and `passwords.matches(request.currentPassword(), user.getPasswordHash())`. If false, throw `IllegalArgumentException("Current password is incorrect.")`.
     - Check `passwords.matches(request.newPassword(), user.getPasswordHash())`. If true, throw `IllegalArgumentException("New password cannot be the same as current password.")`.
     - Validate `validatePasswordPolicy(request.newPassword())`.
     - Encode new password with `passwords.encode(request.newPassword())`.
     - Update user: `user.resetPassword(newHash, LocalDateTime.now(clock))` and save.
3. **Controller (`AuthController`)**:
   - `POST /api/auth/change-password`
   - Injects `Authentication authentication`. If user is null/not authenticated, return 401.
   - Invokes `auth.changePassword(principal.id(), body)`.
   - Returns `200 OK` with `ApiResponse.ok("Password changed successfully", null)`.

### 4.2 Frontend Architecture
1. **Service (`authService.js`)**:
   - Add `changePassword: data => post('/api/auth/change-password', data)`.
2. **Components**:
   - `ChangePasswordForm.js`: Renders form with current password, new password, confirm new password, eye toggles, password rules indicator, error/success feedback.
   - `ChangePasswordPage.js`: Mounts change password view. If user is not logged in, redirects to login.
3. **Navigation & Links**:
   - Add "Change password" option to `renderUserDropdown` in `frontend/src/shared/Header.js`.
   - Add route `#/change-password` in `frontend/src/main.js`.
   - Add "Change password" section in `frontend/src/roles/mentee/AccountPage.js`.

---

## 5. Directory & File Manifest

```text
backend/src/main/java/com/happyprogramming/
├── dto/ChangePasswordRequest.java               # Request DTO
├── service/AuthService.java                     # Change password business logic
└── controller/AuthController.java               # POST /api/auth/change-password endpoint

frontend/src/
├── roles/auth/ChangePasswordForm.js             # Form component with validation and rule checklist
├── roles/auth/ChangePasswordPage.js             # Page component
├── roles/auth/authService.js                    # Client method
├── roles/mentee/AccountPage.js                  # Link/section for password change in account
├── shared/Header.js                             # Dropdown menu entry
└── main.js                                      # Route registration
```
