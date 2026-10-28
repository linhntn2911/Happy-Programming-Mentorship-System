# Feature Specification: Change Password

**Feature Branch / Directory**: `specs/015-change-password`  
**Status**: In Progress  
**Input**: "làm thêm cho t chức năng đổi mật khẩu"

## 1. Overview & Business Value

Allows authenticated users (Mentees, Mentors, Staff, Admins) to securely change their account password. Users supply their current password to verify identity, enter a compliant new password, confirm it, and receive immediate feedback.

## 2. User Stories & Acceptance Criteria

### User Story 1 - Authenticated User Changes Password (Priority: P1)
As an authenticated user,  
I want to change my account password by providing my current password and a new password,  
So that I can keep my account secure.

#### Acceptance Criteria:
1. **Given** an authenticated user on `#/change-password` or their Account page,  
   **When** they provide the correct current password and a valid new password (meeting password requirements: $\ge 8$ characters, at least 1 uppercase letter, at least 1 lowercase letter, $\le 72$ bytes, not common) and matching confirmation,  
   **Then** the backend updates the password hash using BCrypt, returns a success response, and the frontend displays a confirmation message ("Your password has been changed successfully.").

2. **Given** an incorrect current password,  
   **When** the user submits the form,  
   **Then** the request is rejected with 400 Bad Request and the error message *"Current password is incorrect."* without revealing sensitive internal details.

3. **Given** a new password identical to the current password,  
   **When** the user submits the form,  
   **Then** the request is rejected with 400 Bad Request stating *"New password cannot be the same as current password."*

4. **Given** a new password that fails the password policy ($\le 7$ characters, no uppercase, no lowercase, or common dictionary password),  
   **When** the user attempts submission,  
   **Then** descriptive feedback is displayed explaining the policy rule violated.

5. **Given** an unauthenticated request to `POST /api/auth/change-password`,  
   **Then** the server responds with 401 Unauthorized.

6. **Given** an unauthenticated user navigating to `#/change-password`,  
   **Then** they are redirected to `#/login?return=change-password`.

## 3. UI Requirements
- User dropdown in `Header.js` includes a "Change password" link pointing to `#/change-password`.
- `#/change-password` page provides:
  - Current password input with show/hide password visibility toggle.
  - New password input with show/hide toggle and dynamic policy checklist.
  - Confirm new password input with show/hide toggle.
  - "Update password" primary action button and "Cancel" button.
- User-facing web copy is English.
- Styling adheres to the HappyProgramming design system (brand purple `#8b46e8`, dark purple `#7431d0`, ink `#25143f`, cream `#fbf9ff`, line `#e8e0f1`).
