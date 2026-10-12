# Hướng dẫn thiết lập cổng thanh toán SePay (HappyProgramming)

Hệ thống HappyProgramming sử dụng cổng thanh toán tự động qua chuyển khoản ngân hàng **SePay**:
- **Ngân hàng**: TPBank
- **Số tài khoản**: `00000806194`
- **Chủ tài khoản**: `NGUYEN THI NGOC LINH`
- **Mã API Key Webhook**: `hpms_sepay_secret_2026`
- **Đường dẫn Webhook**: `/api/payments/sepay/webhook` (ví dụ qua Cloudflare Tunnel: `https://council-tribute-uses-ftp.trycloudflare.com/api/payments/sepay/webhook`)

## Cấu hình biến môi trường (`application.properties`)

```properties
hpms.sepay.enabled=true
hpms.sepay.bank-name=TPBank
hpms.sepay.account-number=00000806194
hpms.sepay.account-holder=NGUYEN THI NGOC LINH
hpms.sepay.api-key=hpms_sepay_secret_2026
hpms.sepay.qr-template=compact
```

## Luồng hoạt động

1. **Khởi tạo thanh toán (`POST /api/mentorship-requests/{id}/checkout`)**:
   - Backend tạo mã đơn thanh toán dạng `HP` + request ID + attempt ID (ví dụ: `HP12A1`).
   - Tự động sinh link ảnh VietQR SePay:
     `https://qr.sepay.vn/img?bank=TPBank&acc=00000806194&template=compact&amount={amount}&des=HP12A1`
   - Trả về thông tin QR và tài khoản ngân hàng.

2. **Giao diện Mentee (`/#/checkout?requestId={id}`)**:
   - Hiển thị trực tiếp ảnh mã QR SePay.
   - Bảng thông tin: Ngân hàng, Số tài khoản, Chủ tài khoản, Số tiền, Nội dung chuyển khoản kèm nút sao chép (Copy).
   - Bộ đếm thời gian 15 phút.
   - Frontend tự động kiểm tra trạng thái mỗi 3 giây.

3. **SePay Webhook (`POST /api/payments/sepay/webhook`)**:
   - Khi có tiền về tài khoản TPBank `00000806194`, SePay gửi webhook kèm `Authorization: Apikey hpms_sepay_secret_2026`.
   - Backend xác thực API Key, kiểm tra đúng STK, đúng số tiền và khớp mã đơn `HP...`.
   - Chuyển trạng thái thanh toán sang `SUCCEEDED`, đưa tiền vào Escrow, tự động kích hoạt gói Mentorship và mở kênh trao đổi với Mentor.
   - Frontend tự động nhận diện và chuyển ngay sang màn hình *"Thanh toán thành công!"*.
