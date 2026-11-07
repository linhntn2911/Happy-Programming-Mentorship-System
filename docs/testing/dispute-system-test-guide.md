# Kịch bản & Báo cáo Kiểm thử Hệ thống: Luồng Khiếu nại (Dispute System Test Guide)

> **Dự án:** HappyProgramming Mentorship Platform  
> **Phân hệ:** Quản lý Khiếu nại & Hoàn tiền (Dispute Management & Mentee Refund Lifecycle)  
> **Phiên bản tài liệu:** 1.0  
> **Tác giả:** DangTK & Development Team  
> **Môi trường thử nghiệm:** Localhost (Frontend: `http://localhost:5173`, Backend: `http://localhost:8080`, SQL Server 2022/2025)

---

## 1. Mục tiêu & Phạm vi Kiểm thử Hệ thống (System Test Scope)

Kiểm thử hệ thống (System Testing) nhằm xác thực toàn diện quy trình xử lý khiếu nại từ đầu đến cuối (End-to-End) theo đúng nguyên tắc nghiệp vụ:
1. **Mentee (Người khiếu nại):** Nộp đơn khiếu nại kèm danh mục sự cố, giải trình chi tiết (30–2,000 ký tự), bằng chứng ảnh chụp màn hình bắt buộc (1–5 ảnh PNG/JPG/WEBP $\le$ 5MB) và thông tin STK ngân hàng nhận tiền hoàn.
2. **Staff (Nhân viên nghiệp vụ):**
   - **Nhánh 1 - Duyệt nhanh (Fast-track Direct Refund):** Đối với các sự cố rõ ràng (Mentor không đến dự buổi học, sự cố kỹ thuật nghiêm trọng), Staff bấm duyệt hoàn tiền ngay lập tức (`FULL_REFUND` hoặc `PARTIAL_REFUND`) sang trạng thái `APPROVED` để chuyển sang Admin.
   - **Nhánh 2 - Mở phòng đối chất (Mediation Room):** Đối với các khiếu nại có tranh chấp, Staff bấm **"Intake Case"** $\rightarrow$ Trạng thái chuyển thành `IN_MEDIATION`, hệ thống mở phòng đối chất 3 bên (Mentee, Mentor, Staff) với thời hạn phản hồi 24h. Sau khi đối chất, Staff ra quyết định: Hoàn tiền (`APPROVED`) hoặc Bác khiếu nại (`REJECTED`).
   - **Nguyên tắc phân quyền:** Staff **không có quyền** bấm đã trả tiền (`PAID`/`RESOLVED`).
3. **Admin (Quản trị viên giữ tài khoản ngân hàng):**
   - Tiếp nhận danh sách các khiếu nại đã được Staff duyệt (`APPROVED`).
   - Thực hiện chuyển khoản ngoài đời thực bằng tài khoản ngân hàng hệ thống đến STK của Mentee.
   - Ghi nhận **Mã giao dịch ngân hàng (Transfer Reference)** và bấm **"Record transfer"** $\rightarrow$ Trạng thái chuyển thành `RESOLVED`.
   - Nếu phát hiện thông tin tài khoản sai lệch, Admin có quyền từ chối (`REJECTED`) kèm lý do.

---

## 2. Tiền điều kiện & Tài khoản thử nghiệm (Test Preconditions)

| Vai trò | Email đăng nhập | Mật khẩu | Quyền hạn trong luồng khiếu nại |
|---|---|---|---|
| **Mentee** | `mentee@example.com` (hoặc tạo mới tại `#/signup/mentee`) | `Password123!` | Tạo khiếu nại, tải ảnh bằng chứng, đối chất, theo dõi kết quả hoàn tiền |
| **Mentor** | `nt1414856@gmail.com` | `Password123!` | Nhận thông báo khiếu nại, nộp giải trình đối chất |
| **Staff** | `staff@example.com` | `Password123!` | Tiếp nhận đơn, mở phòng đối chất, duyệt hoàn tiền (`APPROVED`) hoặc từ chối (`REJECTED`) |
| **Admin** | `admin@example.com` | `Password123!` | Chuyển khoản thực tế, xác nhận chi trả (`RESOLVED/PAID`) với mã giao dịch ngân hàng |

---

## 3. Ma trận Kịch bản Kiểm thử Hệ thống (System Test Matrix)

| Test Case ID | Tên kịch bản (Scenario) | Vai trò thực hiện | Trạng thái ban đầu | Hành động (Action) | Trạng thái kết thúc | Kết quả mong đợi (Expected Result) |
|---|---|---|---|---|---|---|
| **TC-SYS-DSP-01** | Mentee nộp khiếu nại hợp lệ | Mentee | `CONFIRMED` / `ACTIVE` | Nộp form khiếu nại kèm $\ge 1$ ảnh chứng cứ và STK ngân hàng | `SUBMITTED` | Khiếu nại được tạo thành công, mã ticket `HP-DSP-...`, tiền escrow bị đóng băng |
| **TC-SYS-DSP-02** | Staff duyệt hoàn tiền nhanh (Nhánh 1) | Staff | `SUBMITTED` | Chọn `FULL_REFUND` hoặc `PARTIAL_REFUND`, nhập lý do, bấm Duyệt | `APPROVED` | Trạng thái chuyển thành `APPROVED`, lưu ID Staff duyệt, xuất hiện tại hàng đợi Admin |
| **TC-SYS-DSP-03** | Staff mở phòng đối chất (Nhánh 2) | Staff | `SUBMITTED` | Bấm nút **"Intake Case"** | `IN_MEDIATION` | Trạng thái chuyển sang `IN_MEDIATION`, gán `assigned_staff_id`, kích hoạt phòng đối chất |
| **TC-SYS-DSP-04** | Staff duyệt hoàn tiền sau đối chất | Staff | `IN_MEDIATION` | Chọn phương án hoàn tiền và bấm Xác nhận | `APPROVED` | Dispute chuyển sang `APPROVED`, sẵn sàng chờ Admin chi tiền |
| **TC-SYS-DSP-05** | Staff bác đơn khiếu nại | Staff | `IN_MEDIATION` hoặc `SUBMITTED` | Chọn phương án `REJECTED`, nhập lý do bác đơn | `REJECTED` | Tiền escrow được giải phóng cho Mentor, trạng thái dịch vụ phục hồi |
| **TC-SYS-DSP-06** | Admin chi trả hoàn tiền thành công | Admin | `APPROVED` | Chuyển khoản ngoài, nhập `Transfer Reference` $\rightarrow$ Xác nhận | `RESOLVED` | Trạng thái chuyển thành `RESOLVED`, lưu mã giao dịch và audit của Admin |
| **TC-SYS-DSP-07** | Admin từ chối đơn hoàn tiền | Admin | `APPROVED` | Bấm `Reject`, nhập lý do từ chối | `REJECTED` | Hủy lệnh hoàn tiền, giải phóng tiền bảo lưu, lưu lý do từ chối |
| **TC-SYS-DSP-08** | Kiểm thử ràng buộc bảo mật & dữ liệu | Nhiều vai trò | Mọi trạng thái | Thử các hành vi vi phạm (xem mục 5) | Bị chặn (400/403/409) | Hệ thống từ chối vi phạm, không làm sai lệch dữ liệu |

---

## 4. Hướng dẫn Từng bước Kiểm thử trên Trình duyệt (Browser Walkthrough)

### Bước 1: Mentee nộp khiếu nại (TC-SYS-DSP-01)
1. Truy cập `http://localhost:5173/#/login` và đăng nhập bằng tài khoản **Mentee**.
2. Điều hướng tới trang Khiếu nại tại `http://localhost:5173/#/disputes`.
3. Bấm nút **"File a dispute"**:
   - **Booking or mentorship:** Chọn một buổi học hoặc gói mentorship có vấn đề.
   - **Category:** Chọn lý do (ví dụ: `Mentor no-show`).
   - **What happened?:** Nhập giải trình (tối thiểu 30 ký tự, ví dụ: `"Mentor vắng mặt không tham gia buổi học và không liên lạc trước."`).
   - **Image evidence:** Chọn từ 1 đến 5 file ảnh bằng chứng (`.png`, `.jpg`, `.webp`).
   - **Receiving Bank Details:** Nhập tên ngân hàng (ví dụ: `Vietcombank`), Số tài khoản (ví dụ: `0123456789`), Tên chủ tài khoản (ví dụ: `NGUYEN VAN MENTEE`).
   - Tích chọn xác nhận cam kết sự thật.
4. Bấm **"Submit dispute"**.
   - **Kết quả:** Modal đóng lại, bảng khiếu nại xuất hiện dòng mới với trạng thái `● Submitted`, mã vé `HP-DSP-...`.

---

### Bước 2A: Staff duyệt hoàn tiền nhanh không cần đối chất (TC-SYS-DSP-02 - Nhánh 1)
1. Đăng xuất và đăng nhập tài khoản **Staff** tại `http://localhost:5173/#/login`.
2. Truy cập **Staff Workspace $\rightarrow$ Reports & Disputes** (`http://localhost:5173/#/staff/reports`).
3. Trong bảng "Dispute queue", bấm nút **"Review Ticket"** tại ticket vừa tạo.
4. Modal chi tiết mở ra:
   - Hiển thị đầy đủ thông tin: Người khiếu nại, Mentor, lý do, ảnh bằng chứng đã upload (có nút Download).
   - Tại mục **"Step 2: Adjudicate & Finalize Resolution"**:
     - **Settlement Outcome:** Chọn `Full refund to mentee (100% mentee - forwards to Admin)`.
     - **Mentee Refund:** Hiển thị đủ 100% số tiền (hoặc chỉnh sửa nếu là một phần).
     - **Mentee Receiving Bank Account:** Thông tin ngân hàng của Mentee tự động được điền sẵn.
     - **Resolution Explanation:** Nhập kết luận nghiệp vụ (tối thiểu 10 ký tự, ví dụ: `"Xác minh mentor vắng mặt qua nhật ký phòng học, chấp thuận hoàn trả 100% cho học viên."`).
5. Bấm **"Confirm & Submit Decision"**.
   - **Kết quả:** Modal cập nhật banner vàng: *"Refund Approved · Awaiting Admin Bank Transfer"*. Dispute chuyển sang trạng thái `● Approved`.
   - **Xác nhận phân quyền:** Staff **không có nút nào để xác nhận đã trả tiền**.

---

### Bước 2B: Staff mở phòng đối chất Mentee - Mentor (TC-SYS-DSP-03 & TC-SYS-DSP-04 - Nhánh 2)
*(Thực hiện kịch bản này khi cần hai bên giải trình đối chất)*
1. Tại modal Review Ticket của đơn `SUBMITTED`, Staff bấm nút **"Intake Case"** tại mục Step 1.
2. **Kết quả:**
   - Trạng thái vé chuyển sang `● In mediation`.
   - Hệ thống kích hoạt phòng trao đổi 3 bên (Mentee, Mentor, Staff).
   - Mentee và Mentor có thể gửi tin nhắn giải trình và bổ sung chứng cứ. Staff theo dõi tiến trình.
3. Sau khi theo dõi xong: Staff mở lại vé, chọn kết quả:
   - Nếu đồng ý hoàn tiền: Chọn `FULL_REFUND` $\rightarrow$ Bấm gửi $\rightarrow$ Chuyển sang `APPROVED` chờ Admin.
   - Nếu thấy lý do không chính đáng: Chọn `REJECTED` $\rightarrow$ Nhập lý do từ chối $\rightarrow$ Vé đóng với trạng thái `● Rejected`, tiền bảo lưu trả lại cho Mentor.

---

### Bước 3: Admin chi tiền chuyển khoản và hoàn tất (TC-SYS-DSP-06)
1. Đăng xuất và đăng nhập tài khoản **Admin** tại `http://localhost:5173/#/login`.
2. Mở **Admin Workspace $\rightarrow$ Mentee refunds** (`http://localhost:5173/#/admin` tab `Refunds`).
3. Kiểm tra danh sách "Refund queue":
   - Các đơn `APPROVED` hiển thị nút hành động: **[Record transfer]** và **[Reject]**.
   - Thông tin hiển thị: Mã vé, Tên Mentee, Số tiền hoàn trả, Tên Ngân hàng + Số tài khoản + Chủ tài khoản, Tên Staff đã duyệt.
4. Admin dùng ứng dụng ngân hàng thực hiện chuyển tiền ngoài cho Mentee.
5. Trên hệ thống, Admin bấm nút **"Record transfer"**:
   - Nhập **Mã giao dịch ngân hàng (Transfer Reference)** (ví dụ: `VCB9823746123`).
6. Bấm **Xác nhận**.
   - **Kết quả:** Vé chuyển thành `● Resolved`, hiển thị mã tham chiếu chuyển khoản. Tiền escrow ghi nhận hoàn tất và Mentee nhận thông báo đã nhận được tiền.

---

### Bước 4: Mentee kiểm tra kết quả cuối cùng
1. Mentee đăng nhập lại vào `http://localhost:5173/#/disputes`.
2. Bấm nút **"Details"** xem vé đã được giải quyết:
   - Hiển thị trạng thái `● Resolved`.
   - Hiển thị số tiền hoàn trả và **Mã giao dịch ngân hàng** do Admin cung cấp để Mentee đối soát tài khoản ngân hàng của mình.

---

## 5. Kiểm thử Ràng buộc Bảo mật & Dữ liệu (TC-SYS-DSP-08)

1. **Ràng buộc vai trò Staff:**
   - Thử gửi request `POST /api/admin/refund-requests/{id}` bằng tài khoản Staff $\rightarrow$ Hệ thống trả về `403 Forbidden`.
2. **Ràng buộc số tiền hoàn trả một phần (`PARTIAL_REFUND`):**
   - Nhập số tiền hoàn là `0 VND` hoặc âm $\rightarrow$ Bị chặn (Validation Error).
   - Nhập số tiền hoàn lớn hơn số tiền đã thanh toán $\rightarrow$ Bị chặn: *"Partial refund amount must be between 1 and [Total] VND"*.
3. **Ràng buộc chứng cứ bắt buộc:**
   - Nộp khiếu nại không đính kèm file ảnh nào $\rightarrow$ Bị chặn: *"Attach between 1 and 5 evidence images"*.
   - Đính kèm file không phải ảnh (`.pdf`, `.txt`, `.exe`) $\rightarrow$ Bị chặn: *"Evidence must be PNG, JPG, or WEBP"*.
4. **Ràng buộc đơn trùng lặp:**
   - Nộp thêm khiếu nại cho cùng 1 booking trong khi khiếu nại cũ đang mở $\rightarrow$ Hệ thống chặn không cho tạo trùng lặp (`409 Conflict`).

---

## 6. Đánh giá & Kết luận

* **Độ bao phủ (Coverage):** Đã kiểm thử 100% các trạng thái của vòng đời khiếu nại (`SUBMITTED` $\rightarrow$ `IN_MEDIATION` $\rightarrow$ `APPROVED` $\rightarrow$ `RESOLVED` / `REJECTED`).
* **Tính toàn vẹn nghiệp vụ:** Đúng nguyên tắc phân quyền 2 tầng: Staff thẩm định hồ sơ $\rightarrow$ Admin chi tiền từ tài khoản ngân hàng hệ thống $\rightarrow$ Cả hai đều được ghi vết rõ ràng trên Audit log.
