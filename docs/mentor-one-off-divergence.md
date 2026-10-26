# Divergence Record — One-Off Session (Mentor scope)

- Ngày ghi nhận: 2026-10-26 | Branch: `Trung` | Commit: `1d54acb`
- Phạm vi: **MENTOR**. Tài liệu này chỉ ghi nhận lệch giữa SRS và cài đặt cho luồng one-off ở phía mentor; KHÔNG thay đổi code, KHÔNG sửa spec 022 (thuộc phạm vi Mentee).
- Nguồn đối chiếu: `SRS_G3_V1.1 (3).docx` §3.3 "UC - Book One-Off Session"; `backend/src/**`; `docs/database/migration/024_*`, `025_*`; `specs/022-one-off-session-mentee/`.

## 1. SRS quy định (nguyên văn rút từ docx)

| Mục | Nội dung SRS |
|---|---|
| Tên UC | §3.3 "UC - Book One-Off Session", gán số **"UC29 - Book One-Off Session"** |
| Actor | **Mentee** — "Mentee selects a one-off consultation session (e.g., 30 or 60 minutes) on a mentor's profile." |
| PRE-2 | "Mentor has published one-off offerings and configured available slots." |
| Luồng chính | "1. Mentee selects a one-off session offering. 2. System opens the appointment calendar and the mentee selects an available slot. 3. System places a temporary hold on the slot. 4. Mentee enters the discussion agenda and proceeds to payment." |
| **BR-07** | "One-off sessions are **confirmed automatically upon payment without manual mentor screening**." |
| POST-1 | "Session is created with **confirmed status**, slot is reserved, **payment is held in Escrow**, and **Google Meet** room details are generated." |
| POST-2 | "Calendar invites (**.ics**) with meeting room link are **emailed to both parties via Gmail**." |

**Mâu thuẫn nội bộ của SRS về số UC:** §3.3 ghi "UC29 - Book One-Off Session" **trùng số** với "UC29 - Apply for Monthly Mentorship"; mục notification lại gọi "Book One-Off Session (**UC06**)". → Không có số UC nhất quán để bám; BR-07 cũng bị overload (BR-07 của monthly nói "activated only after a server-verified payment").

## 2. Cài đặt thực tế (phía mentor)

| Khía cạnh | Code |
|---|---|
| Endpoint tạo request | `backend/.../controller/MentorshipRequestController.java:45-49` — POST `/api/one-off-requests` → `createOneOff` |
| Service | `backend/.../service/MentorshipRequestService.java:209` `createOneOff`; `INSERT_ONE_OFF_REQUEST` (`:79-85`) chèn `service_type='ONE_OFF'`, `status='PENDING'`, `funded_at=NULL` |
| Ràng buộc offering | `SELECT_ONE_OFF_OFFERING` (`:67-70`) yêu cầu `service_type='ONE_OFF' AND status='ACTIVE'` |
| Chống trùng | `COUNT_ACTIVE_ONE_OFF_REQUESTS` (`:73-75`) chặn double one-off request cho cùng cặp mentee/mentor |
| **Mentor quyết định** | `backend/.../controller/MentorController.java:105` — PUT `/api/mentors/me/requests/{requestId}/decision`: one-off đi **chung** luồng duyệt accept/decline với monthly |
| Schema | Migration `024_20261014_allow_one_off_requests.sql` (V16): nới `CK_requests_type` nhận `ONE_OFF`; rescope `UX_requests_pending_pair` thành `(mentee_id, mentor_id, service_type)` để monthly + one-off pending cùng tồn tại. **Không có thanh toán.** |
| Dữ liệu demo | Migration `025_20261014_seed_one_off_demo_sessions.sql` (V17): seed ONE_OFF giá **300000 VND**. Comment gốc: "mentors cannot yet publish one-off sessions". |

**Không cài đặt:** auto-confirm-on-payment, Google Meet, gửi .ics/Gmail, Escrow hold tại thời điểm booking, mentor tự publish one-off offering.

## 3. Bản chất lệch

SRS mô tả one-off là luồng **Mentee-driven, auto-confirm khi thanh toán, KHÔNG có bước mentor duyệt** (BR-07). Cài đặt chọn hướng **NGƯỢC**: tái dùng lifecycle **approval-first** của `mentorship_requests` — request rơi vào `PENDING`, **mentor duyệt** (accept/decline) y như monthly, mentee trả sau; ở iteration này one-off **không gắn thanh toán**.

Hệ quả phía mentor: mentor **có** bước sàng lọc one-off (khác SRS nói "without manual mentor screening"). Đây là điểm lệch chính cần tự khai trước hội đồng.

## 4. Lý do chọn hướng lệch

1. Tái dùng hạ tầng request/decision/notification của monthly đã được test kỹ (MTC051–064, 142–143), tránh xây song song một luồng thanh toán + lịch + Meet riêng cho phạm vi mentor.
2. Giữ một model `mentorship_requests` duy nhất (phân biệt bằng `service_type`), đơn giản hoá dashboard, request list và decision endpoint của mentor.
3. Auto-confirm-on-payment + Escrow + Google Meet + .ics/Gmail là tổ hợp tích hợp ngoài phạm vi role mentor và ngoài iteration hiện tại; đưa vào sẽ kéo theo phụ thuộc SePay/Google API/Gmail chưa được duyệt cho one-off.

## 5. Trạng thái & việc còn thiếu

- Đã test: **MTC051–055** (tạo/duyệt one-off phía mentor).
- Chưa xây: mentor tự publish one-off offering (PRE-2 của SRS giả định đã có); hiện chỉ **nhận** request trên offering do seed (migration 025) tạo.
- Giá 300000 VND là **seed demo**, không phải con số trong SRS.

## 6. Khuyến nghị (chờ duyệt, KHÔNG tự thực hiện)

- Nếu hội đồng yêu cầu bám SRS: cần spec riêng cho one-off auto-confirm + payment + Meet/.ics, tách khỏi luồng approval-first; KHÔNG sửa spec 022 (mentee-scoped) để chứa logic mentor.
- Nếu chấp nhận hướng hiện tại: cập nhật SRS §3.3 để phản ánh approval-first + bỏ/sửa BR-07 auto-confirm, và dựng màn mentor publish one-off offering.

*Xem thêm: `MENTOR_MASTER_DEFENSE_MAP.md` (mục M2, dòng 17 Part 2, MTC051–055).*
