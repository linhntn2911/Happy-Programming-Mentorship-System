package com.happyprogramming.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record CheckoutResponse(
        Long paymentId,
        Long requestId,
        String status,
        BigDecimal amount,
        String currency,
        String paymentReference,
        String paymentUrl,
        Instant expiresAt,
        String message,
        String qrCodeUrl,
        String bankName,
        String accountNumber,
        String accountHolder
) {
    public CheckoutResponse(Long paymentId, Long requestId, String status, BigDecimal amount,
                            String currency, String paymentReference, String paymentUrl,
                            Instant expiresAt, String message) {
        this(paymentId, requestId, status, amount, currency, paymentReference, paymentUrl,
                expiresAt, message, paymentUrl, null, null, null);
    }
}
