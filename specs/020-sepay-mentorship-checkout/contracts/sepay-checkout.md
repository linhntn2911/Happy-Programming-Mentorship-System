# SePay Checkout Contracts

## Initiate checkout
`POST /api/mentorship-requests/{id}/checkout` (authenticated owning mentee)

Response `ApiResponse.data`:
```json
{
  "paymentId": 812,
  "requestId": 99,
  "status": "PENDING",
  "amount": 2500000.00,
  "currency": "VND",
  "paymentReference": "HP812",
  "paymentUrl": "https://qr.sepay.vn/img?bank=TPBank&acc=00000806194&template=compact&amount=2500000&des=HP812",
  "qrCodeUrl": "https://qr.sepay.vn/img?bank=TPBank&acc=00000806194&template=compact&amount=2500000&des=HP812",
  "bankName": "TPBank",
  "accountNumber": "00000806194",
  "accountHolder": "NGUYEN THI NGOC LINH",
  "expiresAt": "2026-10-12T06:45:00Z",
  "message": "SePay QR payment is ready."
}
```

## Checkout Information
`GET /api/mentorship-requests/{id}/checkout-info` (authenticated owning mentee)

Returns application status, offer details, and when a payment attempt is pending:
`paymentReference`, `paymentStatus`, `paymentExpiresAt`, `paymentRemainingSeconds`, `serverNow`, `qrCodeUrl`, `bankName`, `accountNumber`, `accountHolder`. The browser counts down from `paymentRemainingSeconds`, calculated by SQL Server, so client timezone or clock drift cannot expire a fresh QR early.

`serviceType` distinguishes `MONTHLY` and `ONE_OFF`. For `ONE_OFF`, `amount` is the immutable `totalPrice`, the payment expiry cannot exceed the slot-hold expiry, and no mentor acceptance step is required.

## SePay Webhook
`POST /api/payments/sepay/webhook` (public server-to-server; secured with API key header)

Header:
`Authorization: Apikey <SEPAY_API_KEY>`

Request body:
```json
{
  "id": 928374,
  "gateway": "TPBank",
  "transactionDate": "2026-10-12 06:30:00",
  "accountNumber": "00000806194",
  "code": "HP812",
  "content": "HP812 chuyen khoan thanh toan",
  "transferType": "in",
  "transferAmount": 2500000,
  "accumulated": 10500000,
  "subAccount": null,
  "referenceCode": "FT2428512345678",
  "description": ""
}
```

Response (HTTP 200):
```json
{
  "success": true,
  "message": "Payment confirmed and mentorship activated."
}
```

## Validation and financial repair contract
Missing/disabled SePay configuration: HTTP 503. Missing or invalid `Apikey` authorization: HTTP 401. Missing transfer type, account or positive SePay `id`: HTTP 400. Non-inbound or wrong-account events are acknowledged but ignored. Stable provider id is the event identity. Only a matching SEPAY/VND PENDING attempt before its expiry can settle; late/cancelled/other-provider transfers return success=false with reconciliation required and create no financial records. A repeated event for the same payment is acknowledged; reuse for another payment is rejected. Wallet available = released - paid - requested reservations. Admin reported commission is gross estimated, whole-VND per payment, before refunds and release.

The payment-window check uses the authenticated SePay `transactionDate`, interpreted in `Asia/Ho_Chi_Minh`, so a transfer made before expiry can survive delayed webhook delivery. SQL Server `DATETIME2` payment and hold values are stored as UTC wall-clock values and must be converted explicitly at JDBC boundaries; the host JVM timezone must not shift them. A delayed one-off settlement additionally locks and verifies that no active hold or booking has claimed the interval.

For one-off settlement, the webhook must also lock and validate the matching `HELD` slot. Successful settlement changes the hold to `CONVERTED` and inserts `CONFIRMED` booking rows exactly once. It must not create a monthly subscription.
