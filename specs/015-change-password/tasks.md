# Tasks: 015-change-password

Ordered, verifiable implementation tasks for the Change Password feature:

- [x] **Task 1: Backend DTO and Service Logic**
  - Create `com.happyprogramming.dto.ChangePasswordRequest` with `@NotBlank` validations for `currentPassword` and `newPassword`.
  - Add `changePassword(Long userId, ChangePasswordRequest request)` to `com.happyprogramming.service.AuthService`.
  - Validate current password match, verify new password is not identical, validate password policy, encode with BCrypt, and persist user.

- [x] **Task 2: Backend Controller Endpoint & Tests**
  - Add `POST /api/auth/change-password` in `com.happyprogramming.controller.AuthController` requiring authenticated session.
  - Add test in `com.happyprogramming.controller.AuthControllerTest` verifying:
    - Successful password change.
    - Incorrect current password rejection (400).
    - Policy violation rejection (400).
    - Unauthenticated request rejection (401).

- [x] **Task 3: Frontend Client Service & Components**
  - Add `changePassword` method in `frontend/src/roles/auth/authService.js`.
  - Create `frontend/src/roles/auth/ChangePasswordForm.js` with visibility toggles, dynamic rule checklist, and form validation.
  - Create `frontend/src/roles/auth/ChangePasswordPage.js` handling authentication check, loading, and submission states.

- [x] **Task 4: Integration with Router, Header, and Account Page**
  - Register `#/change-password` route in `frontend/src/main.js`.
  - Add "Change password" link to `renderUserDropdown` in `frontend/src/shared/Header.js`.
  - Add Change Password card / section in `frontend/src/roles/mentee/AccountPage.js`.

- [x] **Task 5: Frontend Unit Tests & Verification**
  - Add tests in `frontend/src/roles/auth/ChangePasswordForm.test.js` verifying rendering and input behavior.
  - Run full backend (`mvnw.cmd test`) and frontend (`npm test` and `npm run build`) verification.
