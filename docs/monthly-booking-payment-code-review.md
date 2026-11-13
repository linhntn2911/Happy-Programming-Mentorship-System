# Monthly Mentorship Booking & Payment — Code Review Flow

Tài liệu này dùng để review luồng code **monthly mentorship booking and payment** trên nhánh `linh`.

## Luồng tổng quát

`Mentee submit` → `PENDING` → `Mentor accepts` → `ACCEPTED` → `Checkout` → `Payment PENDING + QR` → `SePay webhook` → `SUCCEEDED + escrow HOLD` → `Subscription + conversation` → `Workspace`

> Điểm quan trọng: trình duyệt không tự xác nhận thanh toán. Chỉ webhook hợp lệ từ SePay mới được phép chuyển payment sang `SUCCEEDED` và mở workspace.

## Mục lục bấm nhanh

1. [Mentee gửi yêu cầu monthly](#step-1)
2. [Frontend gọi Request API](#step-2)
3. [Controller nhận yêu cầu](#step-3)
4. [Service kiểm tra và lưu PENDING](#step-4)
5. [Mentor mở và quyết định yêu cầu](#step-5)
6. [Decision API chuyển trạng thái](#step-6)
7. [Repository bảo vệ việc Accept/Decline](#step-7)
8. [Mentee mở checkout](#step-8)
9. [Backend trả checkout information](#step-9)
10. [Tạo hoặc dùng lại payment PENDING](#step-10)
11. [SePay gọi webhook](#step-11)
12. [Webhook settlement và mở quyền học](#step-12)
13. [Frontend nhận trạng thái thành công](#step-13)
14. [Đi đúng workspace của request](#step-14)
15. [Backend tải workspace và tin nhắn](#step-15)

---

<a id="step-1"></a>
## Bước 1 — Mentee gửi yêu cầu monthly

**Code:** [MonthlyMentorshipApplicationPage.js — submit form](https://github.com/linhntn2911/Happy-Programming-Mentorship-System/blob/linh/frontend/src/roles/mentee/MonthlyMentorshipApplicationPage.js#L57-L83)

- Lấy `mentorId`, `serviceOfferingId`, learning goals, experience level và terms version từ form.
- Chặn gửi nếu thiếu dữ liệu bắt buộc.
- Khi hợp lệ, gọi `mentorshipRequestService.createRequest(...)`.

**Trạng thái ở thời điểm này:** chưa có request trong database.

**Đi tiếp:** [Bước 2 — Frontend gọi Request API](#step-2)

---

<a id="step-2"></a>
## Bước 2 — Frontend gọi Request API

**Code:** [mentorshipRequestService.js — createRequest](https://github.com/linhntn2911/Happy-Programming-Mentorship-System/blob/linh/frontend/src/roles/mentee/mentorshipRequestService.js#L15-L23)

- Gửi `POST /api/mentorship-requests`.
- Body JSON chứa dữ liệu của form monthly.
- Nếu API trả lỗi, `apiFetch` đẩy lỗi trở lại trang để hiển thị cho mentee.

**Đi tiếp:** [Bước 3 — Controller nhận yêu cầu](#step-3)

---

<a id="step-3"></a>
## Bước 3 — Controller nhận yêu cầu

**Code:** [MentorshipRequestController.java — POST /api/mentorship-requests](https://github.com/linhntn2911/Happy-Programming-Mentorship-System/blob/linh/backend/src/main/java/com/happyprogramming/controller/MentorshipRequestController.java#L39-L44)

- Spring validate `CreateMentorshipRequest` bằng `@Valid`.
- Controller chuyển request sang `mentorshipRequestService.create(payload)`.
- Controller chỉ điều phối HTTP; business rule nằm trong service.

**Đi tiếp:** [Bước 4 — Service kiểm tra và lưu PENDING](#step-4)

---

<a id="step-4"></a>
## Bước 4 — Service kiểm tra và lưu `PENDING`

**Code:** [MentorshipRequestService.java — create](https://github.com/linhntn2911/Happy-Programming-Mentorship-System/blob/linh/backend/src/main/java/com/happyprogramming/service/MentorshipRequestService.java#L123-L215)

Service thực hiện lần lượt:

1. Xác định mentee đang đăng nhập.
2. Kiểm tra learning goals và experience level.
3. Kiểm tra mentor tồn tại, hoạt động và package `MONTHLY` còn active.
4. Chặn request monthly trùng với cùng mentor.
5. Chụp snapshot package/giá/terms để dữ liệu không đổi theo package về sau.
6. Insert request với status `PENDING` và response deadline 48 giờ.
7. Gửi notification cho mentor và mentee.

**Kết quả:** màn hình mentee hiển thị “Waiting for mentor decision”; database lưu `PENDING`.

**Đi tiếp:** [Bước 5 — Mentor mở và quyết định yêu cầu](#step-5)

---

<a id="step-5"></a>
## Bước 5 — Mentor mở và quyết định yêu cầu

**Code giao diện:** [MentorRequestsPage.js — decide](https://github.com/linhntn2911/Happy-Programming-Mentorship-System/blob/linh/frontend/src/roles/mentor/MentorRequestsPage.js#L468-L503)

**Code gọi API:** [mentorDashboardService.js — decideOnRequest](https://github.com/linhntn2911/Happy-Programming-Mentorship-System/blob/linh/frontend/src/roles/mentor/mentorDashboardService.js#L26-L44)

- Mentor xem request `PENDING` và bấm Accept hoặc Decline.
- Frontend gửi `PUT /api/mentors/me/requests/{requestId}/decision`.
- Với Accept, bước này **chưa mở workspace** và **chưa tạo subscription**; nó chỉ cho phép mentee đi checkout.

**Đi tiếp:** [Bước 6 — Decision API chuyển trạng thái](#step-6)

---

<a id="step-6"></a>
## Bước 6 — Decision API chuyển trạng thái

**Controller:** [MentorController.java — decision endpoint](https://github.com/linhntn2911/Happy-Programming-Mentorship-System/blob/linh/backend/src/main/java/com/happyprogramming/controller/MentorController.java#L110-L120)

**Service:** [MentorDashboardService.java — decideOnRequest](https://github.com/linhntn2911/Happy-Programming-Mentorship-System/blob/linh/backend/src/main/java/com/happyprogramming/service/MentorDashboardService.java#L94-L123)

- Xác định đúng mentor đang đăng nhập.
- Chuẩn hóa decision thành `ACCEPTED` hoặc `DECLINED`.
- Gọi repository để update có điều kiện.
- Gửi notification cho mentee; nếu Accept, thông báo mentee có thể thanh toán.

**Đi tiếp:** [Bước 7 — Repository bảo vệ việc Accept/Decline](#step-7)

---

<a id="step-7"></a>
## Bước 7 — Repository bảo vệ việc Accept/Decline

**Code:** [MentorshipRequestRepository.java — transitionPendingRequest](https://github.com/linhntn2911/Happy-Programming-Mentorship-System/blob/linh/backend/src/main/java/com/happyprogramming/repository/MentorshipRequestRepository.java#L13-L29)

SQL chỉ update khi đồng thời thỏa mãn:

- Request thuộc đúng mentor.
- `service_type = 'MONTHLY'`.
- Status hiện tại vẫn là `PENDING`.
- Response deadline chưa hết.

Nhờ vậy mentor khác, request hết hạn hoặc request đã được xử lý không thể bị quyết định lần hai.

**Kết quả khi Accept:** request chuyển sang `ACCEPTED`, mentee được mở checkout.

**Đi tiếp:** [Bước 8 — Mentee mở checkout](#step-8)

---

<a id="step-8"></a>
## Bước 8 — Mentee mở checkout

**Code tải trang:** [CheckoutPage.js — mountCheckout](https://github.com/linhntn2911/Happy-Programming-Mentorship-System/blob/linh/frontend/src/roles/mentee/CheckoutPage.js#L99-L155)

**Code bấm tạo QR:** [CheckoutPage.js — startSepay](https://github.com/linhntn2911/Happy-Programming-Mentorship-System/blob/linh/frontend/src/roles/mentee/CheckoutPage.js#L456-L490)

- Trang tải checkout information trước.
- Khi mentee bấm Prepare/Refresh QR, frontend gọi checkout API.
- Frontend chỉ hiển thị QR, thời hạn và trạng thái; không tự đánh dấu payment thành công.

**Đi tiếp:** [Bước 9 — Backend trả checkout information](#step-9)

---

<a id="step-9"></a>
## Bước 9 — Backend trả checkout information

**Controller:** [MentorshipRequestController.java — checkout endpoints](https://github.com/linhntn2911/Happy-Programming-Mentorship-System/blob/linh/backend/src/main/java/com/happyprogramming/controller/MentorshipRequestController.java#L77-L87)

**Service:** [MentorshipRequestService.java — getCheckoutInfo](https://github.com/linhntn2911/Happy-Programming-Mentorship-System/blob/linh/backend/src/main/java/com/happyprogramming/service/MentorshipRequestService.java#L572-L700)

- Chỉ chủ sở hữu request được xem checkout.
- Lấy giá từ snapshot của request, không lấy lại giá package hiện tại.
- Tìm payment gần nhất để trả status, transfer code, QR và thời hạn.
- Endpoint `POST .../{id}/checkout` chuyển sang `SepayPaymentService.initiate(id)`.

**Đi tiếp:** [Bước 10 — Tạo hoặc dùng lại payment PENDING](#step-10)

---

<a id="step-10"></a>
## Bước 10 — Tạo hoặc dùng lại payment `PENDING`

**Code:** [SepayPaymentService.java — initiate](https://github.com/linhntn2911/Happy-Programming-Mentorship-System/blob/linh/backend/src/main/java/com/happyprogramming/service/SepayPaymentService.java#L95-L205)

Service xử lý:

1. Kiểm tra cấu hình SePay, mentee và request đủ điều kiện thanh toán.
2. Nếu payment `PENDING` còn hạn thì dùng lại, tránh tạo payment trùng.
3. Nếu payment cũ hết hạn thì chuyển nó thành `EXPIRED`.
4. Tạo attempt mới và transfer code dạng `HP{requestId}A{attemptNo}`.
5. Insert payment `PENDING`, hạn thanh toán khoảng 15 phút.
6. Sinh VietQR đúng tài khoản, đúng số tiền và đúng transfer code.

**Kết quả:** mentee quét QR và ngân hàng nhận tiền.

**Đi tiếp:** [Bước 11 — SePay gọi webhook](#step-11)

---

<a id="step-11"></a>
## Bước 11 — SePay gọi webhook

**Code:** [PaymentController.java — /api/payments/sepay/webhook](https://github.com/linhntn2911/Happy-Programming-Mentorship-System/blob/linh/backend/src/main/java/com/happyprogramming/controller/PaymentController.java#L19-L24)

- Sau khi ngân hàng ghi nhận tiền vào, SePay gửi payload giao dịch tới backend.
- Controller truyền cả payload và authorization header cho `processWebhook`.
- Đây là điểm vào duy nhất để xác nhận thanh toán thật.

**Đi tiếp:** [Bước 12 — Webhook settlement và mở quyền học](#step-12)

---

<a id="step-12"></a>
## Bước 12 — Webhook settlement và mở quyền học

**Code:** [SepayPaymentService.java — processWebhook](https://github.com/linhntn2911/Happy-Programming-Mentorship-System/blob/linh/backend/src/main/java/com/happyprogramming/service/SepayPaymentService.java#L208-L374)

Service kiểm tra và settlement trong transaction:

1. API key, chiều tiền vào, tài khoản nhận và transfer code.
2. Payment tồn tại, còn `PENDING`, chưa hết hạn và đúng số tiền.
3. Chặn xử lý lại cùng giao dịch/reference.
4. Update payment thành `SUCCEEDED`.
5. Hủy các payment attempt `PENDING` còn lại của request.
6. Ghi escrow ledger `HOLD` và `funded_at`.
7. Tạo monthly subscription với trạng thái khởi tạo theo code hiện tại (`TRIALING`).
8. Tạo hoặc dùng lại conversation `MENTORSHIP` giữa mentor và mentee.
9. Ghi payment event/audit.

**Kết quả:** payment đã xác nhận, tiền được giữ trong escrow, subscription và private conversation đã được provision.

**Đi tiếp:** [Bước 13 — Frontend nhận trạng thái thành công](#step-13)

---

<a id="step-13"></a>
## Bước 13 — Frontend nhận trạng thái thành công

**Code polling:** [CheckoutPage.js — poll checkout state](https://github.com/linhntn2911/Happy-Programming-Mentorship-System/blob/linh/frontend/src/roles/mentee/CheckoutPage.js#L440-L454)

**Code màn hình thành công:** [CheckoutPage.js — paid branch](https://github.com/linhntn2911/Happy-Programming-Mentorship-System/blob/linh/frontend/src/roles/mentee/CheckoutPage.js#L157-L185)

- Frontend định kỳ gọi lại checkout info.
- Khi thấy payment `SUCCEEDED`/`isPaid`, trang render “Payment confirmed”.
- Nút Open mentorship workspace mang theo `requestId` để chọn đúng cuộc trò chuyện.

**Đi tiếp:** [Bước 14 — Đi đúng workspace của request](#step-14)

---

<a id="step-14"></a>
## Bước 14 — Đi đúng workspace của request

**Code khớp request:** [MentorshipWorkspacePage.js — workspaceForBookingRequest](https://github.com/linhntn2911/Happy-Programming-Mentorship-System/blob/linh/frontend/src/shared/MentorshipWorkspacePage.js#L25-L34)

**Code đọc route và tự mở:** [MentorshipWorkspacePage.js — route selection](https://github.com/linhntn2911/Happy-Programming-Mentorship-System/blob/linh/frontend/src/shared/MentorshipWorkspacePage.js#L803-L811)

- Trang đọc `requestId` từ hash/query.
- Tải danh sách workspace của người dùng.
- Tìm workspace learning có `requestId` trùng request vừa thanh toán.
- Tự mở conversation tương ứng thay vì chỉ đưa người dùng tới danh sách chung.

**Đi tiếp:** [Bước 15 — Backend tải workspace và tin nhắn](#step-15)

---

<a id="step-15"></a>
## Bước 15 — Backend tải workspace và tin nhắn

**Service danh sách:** [MentorshipWorkspaceService.java — listMine](https://github.com/linhntn2911/Happy-Programming-Mentorship-System/blob/linh/backend/src/main/java/com/happyprogramming/service/MentorshipWorkspaceService.java#L57-L68)

**Service chi tiết:** [MentorshipWorkspaceService.java — get](https://github.com/linhntn2911/Happy-Programming-Mentorship-System/blob/linh/backend/src/main/java/com/happyprogramming/service/MentorshipWorkspaceService.java#L71-L85)

**Repository scope theo request:** [MentorshipWorkspaceRepository.java — findAccessibleByConversationIdAndRequestId](https://github.com/linhntn2911/Happy-Programming-Mentorship-System/blob/linh/backend/src/main/java/com/happyprogramming/repository/MentorshipWorkspaceRepository.java#L128-L145)

- Chỉ mentor/mentee là thành viên được đọc private workspace.
- Conversation phải ở trạng thái `APPROVED`.
- Khi có `requestId`, repository scope dữ liệu monthly theo đúng subscription/request.
- Backend trả conversation, engagement, one-off sessions liên quan và lịch sử tin nhắn.

**Kết thúc luồng:** mentee và mentor vào đúng funded workspace để nhắn tin, gửi tài liệu và triển khai mentorship.

---

## Các trạng thái cần nhớ khi thuyết trình

| Đối tượng | Chuỗi trạng thái chính |
|---|---|
| Mentorship request | `PENDING` → `ACCEPTED` hoặc `DECLINED`/`EXPIRED` |
| Payment | `PENDING` → `SUCCEEDED` hoặc `EXPIRED`/`CANCELLED` |
| Escrow | Tạo ledger `HOLD` sau webhook hợp lệ |
| Subscription | Được tạo sau payment thành công; code hiện tại khởi tạo `TRIALING` |
| Conversation | `MENTORSHIP` + `APPROVED`, được tạo/dùng lại sau payment thành công |

## Câu kết review ngắn

“Luồng dùng mô hình approval-first: request phải được mentor chấp nhận trước, nhưng quyền học chỉ được mở sau khi webhook SePay xác nhận đúng giao dịch. Settlement chạy trong backend transaction để payment, escrow, subscription và workspace được tạo nhất quán và tránh xử lý trùng.”
