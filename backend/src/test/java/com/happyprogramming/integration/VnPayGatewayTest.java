package com.happyprogramming.integration;

import org.junit.jupiter.api.Test;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class VnPayGatewayTest {
    @Test
    void createsV21HmacUrlAndVerifiesGatewayFields() {
        VnPayGateway gateway = new VnPayGateway("ABC12345", "test-secret", "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
                "http://localhost:8080/api/payments/vnpay/return", true);
        String url = gateway.createPaymentUrl("HP99A1abcdef123456", 2_500_000L, "HPMSHP99A1abcdef123456",
                "127.0.0.1", Instant.parse("2026-10-11T02:00:00Z"), Instant.parse("2026-10-11T02:15:00Z"));

        Map<String, String> parameters = parseQuery(url.substring(url.indexOf('?') + 1));
        assertTrue(url.startsWith("https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?"));
        assertTrue(parameters.containsKey("vnp_SecureHash"));
        assertFalse(parameters.containsKey("vnp_SecureHashType"));
        assertTrue("250000000".equals(parameters.get("vnp_Amount")));
        assertFalse(parameters.containsKey("vnp_BankCode"));
        assertEquals("HPMSHP99A1abcdef123456", parameters.get("vnp_OrderInfo"));
        assertEquals("HP99A1abcdef123456", parameters.get("vnp_TxnRef"));
        assertTrue(parameters.get("vnp_TxnRef").matches("[A-Za-z0-9]+"));
        assertTrue(gateway.isValidResponse(parameters));

        parameters.put("vnp_Amount", "100");
        assertFalse(gateway.isValidResponse(parameters));
    }

    @Test
    void rejectsUnsignedResponseEvenWhenMerchantCodeMatches() {
        VnPayGateway gateway = new VnPayGateway("ABC12345", "test-secret", "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
                "http://localhost:8080/api/payments/vnpay/return", true);
        assertFalse(gateway.isValidResponse(Map.of("vnp_TmnCode", "ABC12345", "vnp_TxnRef", "HP1")));
    }

    private static Map<String, String> parseQuery(String query) {
        Map<String, String> result = new HashMap<>();
        for (String pair : query.split("&")) {
            String[] parts = pair.split("=", 2);
            result.put(URLDecoder.decode(parts[0], StandardCharsets.UTF_8),
                    URLDecoder.decode(parts.length > 1 ? parts[1] : "", StandardCharsets.UTF_8));
        }
        return result;
    }
}
