# MENTOR MASTER DEFENSE MAP — Role Mentor (Nguyễn Bảo Trung)

- Ngày lập: 2026-10-22 | Branch: `Trung` | Commit gần nhất: `f29d871`
- Nguồn đối chiếu:
  - Excel: `Unit_TestCase_Mentor_TrungNB.xlsx` (gốc repo, cập nhật 2026-10-20 13:44) — bản mới nhất.
  - Word: `Unit Test Evidence_Role_Mentor_TrungNB.docx` (gốc repo, 2026-10-20 00:36, 101 ảnh chụp).
  - Code: `backend/src/**`, `frontend/src/roles/mentor/**` tại commit hiện tại.
  - Tài liệu: `SRS_G3_V1.1 (3).docx`, `Package Diagram1.docx`, `Architecture.pdf`, `/specs`, `/docs`.
- Phương pháp: trích xuất tự động (exceljs/jszip/regex) + grep đối chiếu từng dòng code; mọi số liệu dưới đây là kết quả đo, không ước lượng.

---

## PHẦN 1 — BẢNG KIỂM TRA TÍNH ĐẦY ĐỦ (AUDIT MATRIX)

### 1.1 Tổng quan 3 nguồn

| Nguồn | Đơn vị đếm | Số lượng | Kết luận |
|---|---|---|---|
| Excel `Unit_TestCase_Mentor_TrungNB.xlsx` | Mã MTC ở cột Condition (9 sheet) | **172** (MTC001→MTC172) | ĐỦ: unique 172/172, không trùng, không sót số nào trong dải 001–172 |
| Word `Unit Test Evidence_Role_Mentor_TrungNB.docx` | Chuỗi `MTC\d+` trong TOÀN BỘ 121 part XML | **0** | ⚠️ CẢNH BÁO W1: Word chỉ có 12 dòng chữ (bìa + 9 heading MTR_*) + 101 ảnh chụp; không có MTC/text case nào |
| Code `backend/src` + `frontend/src` | Comment `//MTCxxx` | **0** | ⚠️ CẢNH BÁO W2: code không gắn comment MTC; vết liên kết nằm ở tên test method ↔ tiêu đề case trong Excel |
| Code (thay thế) | Test method thật | **174** = 151 `@Test` (27 class Java mentor) + 23 `test()` (9 file JS mentor) | Khớp mức case: 168 PASS + 4 Untested = 172 (xem W3) |

### 1.2 Phân bố MTC theo 9 sheet (Excel TrungNB — đánh số GLOBAL)

| Sheet (chức năng) | Số MTC | Dải MTC |
|---|---|---|
| Mentor_Application (UC15) | 8 | 001–008 |
| Availability_Schedule | 22 | 009–016, 096–105, 160, 162–164 |
| Profile_Management (UC13) | 36 | 017–019, 032–040, 071–088, 094, 125, 131–133, 154 |
| Package_Management | 11 | 025–031, 139–141, 161 |
| Dashboard_Overview | 13 | 020, 023, 089, 093, 106, 111, 113, 115, 150–153, 165 |
| Request_Approval (UC26) | 33 | 021, 022, 024, 051–064, 091, 092, 108–110, 112, 114, 116, 117, 142, 143, 155, 166–169 |
| Workspace_Management | 14 | 065–070, 095, 144–149, 159 |
| Wallet_Payout (UC19) | 22 | 044–050, 118–124, 134–138, 156, 157, 172 |
| Review_Feedback (UC28) | 13 | 041–043, 090, 107, 126–130, 158, 170, 171 |
| **TỔNG** | **172** | unique, liền dải 001–172 |

### 1.3 Cảnh báo cụ thể (theo đúng 3 câu hỏi rà soát)

- **W1 — MTC có trong Excel nhưng THIẾU trong Word: 172/172 (100%).** Word TrungNB không chứa bất kỳ chuỗi MTC nào (quét cả 121 part XML, 0 textbox); bằng chứng là ảnh chụp nhóm theo 9 heading `MTR_APPLICATION … MTR_REVIEWS`. Rủi ro phản biện: không truy vết được bằng text; ma trận chữ nằm ở Excel.
- **W2 — MTC trong Code nhưng chưa vào Excel/Word: 0 comment `//MTC` tồn tại**, nên không có case "code có mà sổ sách thiếu" theo nghĩa comment; tuy vậy liên kết code↔MTC hiện chỉ gián tiếp (tên test method ↔ tiêu đề case). Khuyến nghị (CHƯA thực hiện, chờ duyệt): thêm comment `//MTCxxx` vào 174 test method.
- **W3 — Chênh lệch 174 method vs 172 case:** 2 method gộp chung case (entity/persistence mapping), và 6 method integration gated-DB (`MentorshipWorkspaceRepositoryIntegrationTest` 1, `MentorDashboardTransactionIntegrationTest` 3, `MentorProfileTransactionIntegrationTest` 2) ánh xạ vào 4 case "Untested" của Excel. Công thức đếm sống tại `Test Report`!C21:I21 (168/0/4/107/53/12/172).
- **W4 — Trùng lặp / gõ sai số hiệu: KHÔNG.** Regex `MTC\d{3}` cho đúng 172 giá trị đôi một khác nhau, phủ kín 001–172, không lỗ hổng.

---

## PHẦN 2 — MAPPING 3 CHIỀU (SRS/BR → CODE file:dòng → MTC)

| # | SRS / Spec requirement | Code cài đặt (file:dòng) | MTC tương ứng |
|---|---|---|---|
| 1 | **UC15** Submit CV & Qualification Certificates; **BR-03** OTP/hợp link 15 phút | `backend/.../controller/MentorApplicationController.java:39` (POST `/api/mentor-applications`); `backend/.../entity/SecurityToken.java:45-50` (expiresAt = now+minutes); `backend/.../service/AuthService.java:193` | MTC001–008 (đặc biệt 001, 003, 007) |
| 2 | **UC13** Manage Profile & Biography | `backend/.../controller/MentorController.java:66` (GET `/api/mentors/me/profile`), `:78` (PUT); frontend `frontend/src/roles/mentor/MentorProfilePage.js` | 017–019, 032–040, 077, 094, 125, 131–133, 154 |
| 3 | **UC11** Select & Update Teaching Skills | `backend/.../controller/MentorController.java:85` (GET `/api/skills`); cập nhật qua PUT profile `:78` | 071–088 (dup skill: **MTC086**) |
| 4 | **UC26** Handle Mentorship Requests; **BR-05** không nộp double pending | `backend/.../service/MentorshipRequestService.java:54` và `:76` (guard `status IN ('PENDING','ACCEPTED')`); quyết định: `backend/.../controller/MentorController.java:105` (PUT `/api/mentors/me/requests/{id}/decision`) | 021, 022, 024, 051–064, 091, 092, 108–110, 112, 114, 116, 117, 155, 166–169 |
| 5 | **BR-06** Mentor accept chỉ BẬT checkout, không kích hoạt mentorship | `backend/.../service/MentorshipRequestService.java:382` và `:403` (`funded_at IS NULL` + status guard); checkout: `backend/.../controller/MentorshipRequestController.java:67,73` | 056, 062, 142, 143 |
| 6 | **BR-09** Learning goals ≥ 50 ký tự | `backend/.../dto/CreateMentorshipRequest.java:10` (`@Size(min = 50, max = 4000)`); one-off: `dto/CreateOneOffSessionRequest.java:12` | 057, 152 (one-off: 052) |
| 7 | **BR-10** Slot hold tự hết hạn sau 10 phút; **JOB-02** | `backend/.../controller/MentorAvailabilityController.java:68-76` (POST/DELETE `/api/slot-holds`); `backend/.../service/SlotHoldService.java`; job: `backend/.../scheduler/SlotHoldExpiryJob.java:11-12,24` (scan 900000ms) | 014, 015, 102, 103, 160, 162–164 |
| 8 | **BR-11** Đặt lịch trước ≥ 2 giờ | `backend/.../service/SlotHoldService.java:29` (`MIN_ADVANCE_HOURS = 2`), `:74`, `:77` | 100 |
| 9 | Conflict engine: từ chối slot chồng lấn | `backend/.../service/MentorAvailabilityService.java:58` (409 CONFLICT); isolation SERIALIZABLE: `SlotHoldService.java:23` | 097, 101, 103 |
| 10 | **BR-19** Verified Review Policy (chỉ mentee có booking/subscription hoàn tất) | `backend/.../repository/MentorReviewRepository.java:28-29,37-38,52-53` (JOIN `bookings`/`subscriptions`, không có cột mentor_id) | 008, 090, 129 |
| 11 | **BR-20** Mentor KHÔNG sửa/xóa review | `backend/.../controller/MentorReviewController.java:23` (CHỈ 1 endpoint GET `/api/mentors/me/reviews`, không PUT/DELETE); UI: `frontend/src/roles/mentor/MentorWalletPage.js:60` ("Reviews cannot be edited or deleted") | 041–043, 158, 170, 171 |
| 12 | **UC28** View Net Earnings & Mentee Feedback | `MentorReviewController.java:23` + `backend/.../controller/MentorWalletController.java:24` (GET wallet); UI gộp: `MentorWalletPage.js:12,58-61` ("Earnings and feedback") | 041–043, 090, 107, 126–130, 158 |
| 13 | **UC19/spec 019** Ví mentor, hold 7 ngày, payout OTP-gated | `MentorWalletController.java:30,36,42`; `backend/.../service/MentorWalletService.java:44` (OTP 10 phút), `:153` (createPayoutOtp), `:297` (`DATEADD(DAY,-7,…)` release hold); frontend `mentorWalletService.js:3,15,23` (withCsrf) | 044–050, 118–124, 134–138, 156, 157, 172 |
| 14 | **BR-08** Hủy ≥24h hoàn 100% / <24h giữ 50% | `backend/.../controller/MentorshipRequestController.java:60` (POST cancel); `backend/.../service/MentorshipRequestCancellationTest`-covered service path | 061, 142, 143 |
| 15 | **UC24/UC25** (bước của UC26) Dashboard & xem request | `MentorController.java:95` (GET `/api/mentors/me/dashboard`), `:100` (GET `/api/mentors/me/requests`) | Dashboard: 020, 023, 089, 093, 106, 111, 113, 115, 150–153, 165 |
| 16 | Workspace mentorship (chat/file) — không có số UC trong SRS | `backend/.../controller/MentorshipWorkspaceController.java:29,37,42,48,56` | 065–070, 095, 144–149, 159 |
| 17 | One-off session (spec 022, duyệt hướng tái dùng request approval-first) | `MentorshipRequestController.java:45` (POST `/api/one-off-requests`); migration `docs/database/migration/024_*` (V16) | 051–055 |
| 18 | Packages/gói dịch vụ mentor (UC45 liên quan admin, mentor chọn gói) | `backend/.../controller/MentorPlanController.java`; `backend/.../service/MentorshipPackageSelectionTest`-covered service | 025–031, 139–141, 161 |

### 2.1 Điểm lệch (mismatch) SRS/specs ↔ cài đặt — phải tự khai trước hội đồng

- **M1 (Availability):** SRS nhắc Google Calendar; cài đặt chọn **Hướng C in-app availability + conflict engine + hold 10 phút** (BR-10/BR-11/JOB-02). Lệch có chủ đích, đã test (MTC009–016, 096–105, 160, 162–164).
- **M2 (One-off):** spec 022 mô tả luồng riêng; cài đặt tái dùng request approval-first KHÔNG thanh toán (migration 024/V16 + seed 025/V17); chức năng "mentor tự publish one-off offering" chưa xây (chỉ nhận request).
- **M3 (Phủ UC):** SRS §10 chỉ định danh 5 UC mentor (UC15/13/11/26/28); availability/packages/wallet-payout/one-off/workspace KHÔNG có số UC → map theo BR/JOB như bảng trên.
- **M4 (Stack frontend):** đề bài nói "React" nhưng chuẩn repo (AGENTS.md) là **Vite + Tailwind + vanilla JS modular** — không React hooks; toàn bộ page mentor là JS thuần.
- **M5 (Word evidence):** xem W1 — bằng chứng chữ nằm ở Excel + ảnh chụp trong Word.
- **M6 (BR liên role):** BR-01/02/03 (password/email/OTP) thuộc domain Auth; phạm vi mentor chỉ chạm qua OTP hồ sơ ứng tuyển (MTC001/003/007).

---

## PHẦN 3 — 15 CÂU HỎI PHẢN BIỆN + TRẢ LỜI 30 GIÂY (kèm chỗ mở trong IDE)

1. **Chứng minh 172 MTC đã chạy thật, không phải kê khai?** → Suite chạy thật: 168 PASS + 4 gated; Excel đếm bằng công thức sống `Test Report`!C21:I21 (`SUM(C12:C20)`=168, `I21`=172) tổng hợp từ `COUNTIF/COUNTA` ở dòng 7 từng sheet. Mở: `Unit_TestCase_Mentor_TrungNB.xlsx` → Test Report; chạy lại: `backend/mvnw.cmd test -Dtest=MentorApplicationControllerTest`.
2. **Vì sao code không có comment `//MTC`? Truy vết kiểu gì?** → Truy vết 2 lớp: tiêu đề case trong Excel trùng tên hành vi của test method, và ảnh chụp kết quả chạy trong Word nhóm theo 9 heading. Mở: `backend/src/test/java/com/happyprogramming/controller/MentorApplicationControllerTest.java`. (Khuyến nghị thêm comment — chờ duyệt.)
3. **BR-05 chống nộp double pending nằm đâu?** → Guard SQL `status IN ('PENDING','ACCEPTED')` trước khi insert. Mở: `backend/src/main/java/com/happyprogramming/service/MentorshipRequestService.java:54` và `:76`.
4. **BR-06: accept rồi có bị vượt qua thanh toán để kích hoạt mentorship không?** → Không: checkout chỉ tạo payment attempt khi `funded_at IS NULL` + status PENDING/ACCEPTED; settlement duy nhất qua webhook SePay. Mở: `MentorshipRequestService.java:382` và `:403`; test MTC062/142/143.
5. **BR-10: hold 10 phút ai xóa?** → Job JOB-02 quét 15 phút/lần, nhả hold quá hạn. Mở: `backend/src/main/java/com/happyprogramming/scheduler/SlotHoldExpiryJob.java:24`; test MTC102.
6. **BR-11: chặn đặt lịch sát giờ ở đâu?** → Hằng số `MIN_ADVANCE_HOURS = 2` + check `now+2h`. Mở: `backend/src/main/java/com/happyprogramming/service/SlotHoldService.java:29,74,77`; test MTC100.
7. **BR-19: mentor tự tạo review cho mình được không?** → Không: review join qua `bookings`/`subscriptions` hoàn tất, bảng review không có cột mentor_id để tự gắn. Mở: `backend/src/main/java/com/happyprogramming/repository/MentorReviewRepository.java:28-29`; test MTC008/090.
8. **BR-20: mentor sửa/xóa review bằng API ẩn?** → Controller mentor CHỈ có GET; không tồn tại PUT/DELETE review cho mentor; backend enforce chứ không chỉ ẩn UI. Mở: `backend/src/main/java/com/happyprogramming/controller/MentorReviewController.java:23`; UI `frontend/src/roles/mentor/MentorWalletPage.js:60`; test MTC158.
9. **Hold thu nhập 7 ngày enforce chỗ nào?** → Truy vấn release chỉ chọn payment `paid_at <= now-7d`. Mở: `backend/src/main/java/com/happyprogramming/service/MentorWalletService.java:297`; test MTC156.
10. **Payout có an toàn không (OTP/CSRF/mã hóa)?** → OTP 10 phút (`MentorWalletService.java:44,153`), endpoint `MentorWalletController.java:36,42`, frontend đính `X-CSRF-TOKEN` qua `withCsrf()` (`frontend/src/roles/mentor/mentorWalletService.js:3`), số TK mã hóa + mask (MTC118). Test MTC047–049, 120.
11. **Vì sao Excel đánh số MTC global mà không theo sheet?** → Bản TrungNB chuẩn hóa số hiệu global 001→172; đã kiểm chứng unique + liền dải, sheet chỉ là nhóm chức năng (bảng 1.2).
12. **Word không chữ, chỉ ảnh — hội đồng tra cứu thế nào?** → Mỗi heading MTR_* trong Word chứa ảnh chụp chạy test của đúng sheet đó; ma trận chữ (MTC, expected, result, ngày chạy, công thức tổng hợp) nằm ở Excel; có thể regen bản Word dạng text có code-location map nếu hội đồng yêu cầu.
13. **174 test method sao khai 172 case?** → 2 method gộp case (entity/persistence mapping) + 6 method integration gated-DB ánh xạ 4 case "Untested"; số liệu sống tự đếm lại bằng công thức Excel (W3).
14. **SRS nói Google Calendar, sao làm in-app?** → Quyết định Hướng C có chủ đích: conflict engine + hold trong app, phủ BR-10/BR-11/JOB-02 và test đầy đủ (MTC009–016, 096–105); lệch đã khai ở M1.
15. **IDOR: mentor A quyết định request của mentor B?** → Câu quyết định ràng buộc `WHERE mentor_id = ? … ACTIVE` theo phiên đăng nhập; conflict không lộ ownership. Mở: `MentorshipRequestService.java:47,70` (ownership) và `:53,75`; test MTC021/022.

---

*File sinh tự động từ dữ liệu đo lường ngày 2026-10-22; mọi đường dẫn dòng code đã xác minh bằng grep tại commit hiện tại.*
