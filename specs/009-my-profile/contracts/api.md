# My profile API
All routes require an authenticated active MENTEE (dual-role allowed). Existing ApiResponse envelope; validation 400, missing session 401, ineligible account 403. PUT/DELETE require session CSRF token.
GET /api/profile/me -> {firstName,lastName,email,bio,experienceLevel,learningGoals,githubUrl,portfolioUrl,hasAvatar}. No password or roles writable.
PUT /api/profile/me body {firstName,lastName,bio,experienceLevel,learningGoals,githubUrl,portfolioUrl}; returns saved profile. Names required <=75 each and combined <=150; bio <=1000; goals <=2000; links empty or absolute HTTPS <=500, no embedded credentials; GitHub link must use github.com. Optional blanks normalize to null.
GET /api/profile/me/avatar -> private image/png bytes (404 if absent), no-store.
PUT /api/profile/me/avatar body {base64}: raw Base64 JPEG/PNG <=2MB decoded and 2048x2048; normalized PNG <=2MB. Returns profile.
DELETE /api/profile/me/avatar -> profile with hasAvatar false. No user ID/file ID accepted in any operation.

experienceLevel accepts BEGINNER, FRESHER, JUNIOR, MID, SENIOR, empty or null.
