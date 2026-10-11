# VNPay Checkout Contract

## Start a payment attempt
`POST /api/mentorship-requests/{id}/checkout` (authenticated owning mentee; CSRF required)

The server loads request ownership/status, frozen offer terms, and commission configuration. The browser sends no amount or success result.

Success `ApiResponse.data`:
```json
{
  "paymentId": 812,
  "requestId": 99,
  "status": "PENDING",
  "amount": 2500000.00,
  "currency": "VND",
  "paymentReference": "HP99-1-abcdef123456",
  "paymentUrl": "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?...",
  "expiresAt": "2026-10-11T02:15:00Z",
  "message": "VNPay QR payment is ready."
}
```

Repeated initiation while the same attempt remains unexpired returns that same pending attempt and a newly signed URL with the original expiry. A failed/expired prior attempt is retained and a new attempt number/reference is created. The unique reference is sent as `vnp_TxnRef` and embedded in alphanumeric `vnp_OrderInfo` (`HPMS<reference>`); requests select `vnp_BankCode=VNPAYQR`, and the client displays the reference before opening VNPay's hosted QR checkout.

## Checkout information
`GET /api/mentorship-requests/{id}/checkout-info` returns owner-scoped mentor/package/offer snapshot, application state, paid state, latest payment status/expiry/reference, and `priceAvailable`. No bank details are returned. The payment status is informational and never changes state. A missing legacy snapshot is price-available only when the exact linked active offering has not changed since request submission; otherwise `amount` is null and payment initiation is blocked.

## Cancel an unpaid application
`POST /api/mentorship-requests/{id}/cancel` (authenticated owning mentee; CSRF required) cancels only `PENDING` or `ACCEPTED` applications with no funding and no `PENDING`/`SUCCEEDED` payment. The application and package records are retained for history. A new application can then be submitted against the mentor's currently active package. Attempts with an open checkout or completed payment are rejected.

## VNPay IPN
`GET /api/payments/vnpay/ipn` (public, provider server-to-server)

Valid signed parameters are checked against configured merchant code, the stored transaction reference, stored amount in VND minor units, and currency. Both `vnp_ResponseCode=00` and `vnp_TransactionStatus=00` are required for success. Responses are JSON with provider `RspCode` and `Message`. Duplicate notifications are idempotent.

## Browser return
`GET /api/payments/vnpay/return` (public browser redirect)

This endpoint validates enough callback data to resolve the stored request and redirects to the configured frontend checkout with the request ID. It does not update the payment. The frontend must fetch authenticated checkout info to display the actual server state.
