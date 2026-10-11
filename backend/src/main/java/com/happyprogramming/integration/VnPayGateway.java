package com.happyprogramming.integration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;

@Component
public class VnPayGateway {
    private static final DateTimeFormatter VN_PAY_DATE = DateTimeFormatter.ofPattern("yyyyMMddHHmmss")
            .withZone(ZoneId.of("Asia/Ho_Chi_Minh"));
    private final String tmnCode;
    private final String hashSecret;
    private final String paymentUrl;
    private final String returnUrl;
    private final boolean enabled;

    public VnPayGateway(
            @Value("${hpms.vnpay.tmn-code:}") String tmnCode,
            @Value("${hpms.vnpay.hash-secret:}") String hashSecret,
            @Value("${hpms.vnpay.payment-url:https://sandbox.vnpayment.vn/paymentv2/vpcpay.html}") String paymentUrl,
            @Value("${hpms.vnpay.return-url:http://localhost:8080/api/payments/vnpay/return}") String returnUrl,
            @Value("${hpms.vnpay.enabled:false}") boolean enabled) {
        this.tmnCode = tmnCode == null ? "" : tmnCode.trim();
        this.hashSecret = hashSecret == null ? "" : hashSecret.trim();
        this.paymentUrl = paymentUrl;
        this.returnUrl = returnUrl;
        this.enabled = enabled;
    }

    public boolean isConfigured() {
        return enabled && !tmnCode.isBlank() && !hashSecret.isBlank()
                && !paymentUrl.isBlank() && !returnUrl.isBlank();
    }

    public String createPaymentUrl(String reference, long amountVnd, String orderInfo,
                                   String ipAddress, Instant createdAt, Instant expiresAt) {
        requireConfigured();
        Map<String, String> fields = new TreeMap<>();
        fields.put("vnp_Version", "2.1.0");
        fields.put("vnp_Command", "pay");
        fields.put("vnp_TmnCode", tmnCode);
        fields.put("vnp_Amount", Long.toString(Math.multiplyExact(amountVnd, 100L)));
        fields.put("vnp_CurrCode", "VND");
        // Leave the payment method unspecified so VNPay can show methods enabled for this merchant.
        fields.put("vnp_TxnRef", reference);
        fields.put("vnp_OrderInfo", orderInfo);
        fields.put("vnp_OrderType", "other");
        fields.put("vnp_Locale", "vn");
        fields.put("vnp_ReturnUrl", returnUrl);
        fields.put("vnp_IpAddr", normalizeIp(ipAddress));
        fields.put("vnp_CreateDate", VN_PAY_DATE.format(createdAt));
        fields.put("vnp_ExpireDate", VN_PAY_DATE.format(expiresAt));

        String signedData = encode(fields);
        String signature = hmacSha512(hashSecret, signedData);
        return paymentUrl + (paymentUrl.contains("?") ? "&" : "?") + signedData
                + "&vnp_SecureHash=" + signature;
    }

    public boolean isValidResponse(Map<String, String> parameters) {
        if (!isConfigured() || parameters == null) return false;
        String supplied = parameters.get("vnp_SecureHash");
        if (supplied == null || !tmnCode.equals(parameters.get("vnp_TmnCode"))) return false;
        Map<String, String> signedFields = new TreeMap<>();
        parameters.forEach((key, value) -> {
            if (key != null && key.startsWith("vnp_") && value != null
                    && !key.equals("vnp_SecureHash") && !key.equals("vnp_SecureHashType")) {
                signedFields.put(key, value);
            }
        });
        byte[] expected = hmacSha512(hashSecret, encode(signedFields)).getBytes(StandardCharsets.US_ASCII);
        byte[] actual = supplied.toLowerCase(java.util.Locale.ROOT).getBytes(StandardCharsets.US_ASCII);
        return MessageDigest.isEqual(expected, actual);
    }

    public long getVndAmount(Map<String, String> parameters) {
        try {
            return Long.parseLong(parameters.get("vnp_Amount"));
        } catch (RuntimeException ex) {
            return -1;
        }
    }

    public String getTmnCode() { return tmnCode; }

    public void requireConfigured() {
        if (!isConfigured()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "VNPay checkout is not configured. Set the merchant environment variables first.");
        }
    }

    public static String encode(Map<String, String> values) {
        return values.entrySet().stream()
                .map(entry -> url(entry.getKey()) + "=" + url(entry.getValue()))
                .collect(Collectors.joining("&"));
    }

    private static String url(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private static String normalizeIp(String value) {
        if (value == null || value.isBlank() || value.equals("0:0:0:0:0:0:0:1") || value.equals("::1")) {
            return "127.0.0.1";
        }
        return value.length() > 45 ? value.substring(0, 45) : value;
    }

    private static String hmacSha512(String secret, String input) {
        try {
            Mac mac = Mac.getInstance("HmacSHA512");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA512"));
            byte[] bytes = mac.doFinal(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(bytes.length * 2);
            for (byte value : bytes) hex.append(String.format("%02x", value));
            return hex.toString();
        } catch (Exception ex) {
            throw new IllegalStateException("Could not sign VNPay request.", ex);
        }
    }
}
