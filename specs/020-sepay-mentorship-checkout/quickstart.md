# Quickstart: SePay Mentorship Checkout

## Configuration
Configure environment or `application.properties`:
```properties
hpms.sepay.enabled=true
hpms.sepay.bank-name=TPBank
hpms.sepay.account-number=00000806194
hpms.sepay.account-holder=NGUYEN THI NGOC LINH
hpms.sepay.api-key=hpms_sepay_secret_2026
```

## Mentee Manual Test Path
1. Log in as a mentee.
2. Open an accepted application under `/#/applications`.
3. Click "Pay" to navigate to `/#/checkout?requestId=<id>`.
4. Click "Prepare QR Payment":
   - The SePay VietQR code appears directly on the page.
   - The bank information (TPBank, 00000806194, NGUYEN THI NGOC LINH, amount, transfer code) is clearly shown.
   - Click "Copy" on account number and transfer code to test copy functionality.
5. In development / testing, simulate SePay webhook by sending a POST request to:
   `https://council-tribute-uses-ftp.trycloudflare.com/api/payments/sepay/webhook` (or `http://localhost:8080/api/payments/sepay/webhook`)
   with header `Authorization: Apikey hpms_sepay_secret_2026`
   and payload containing matching `code` and `transferAmount`.
6. Watch the checkout page automatically detect settlement within 3 seconds and switch to "Your mentorship is active".
