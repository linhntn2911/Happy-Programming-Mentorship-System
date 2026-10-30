package com.happyprogramming.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record AdminRefundRequest(
        long id,
        String ticketCode,
        long complainantId,
        String complainantName,
        String complainantEmail,
        long respondentId,
        String respondentName,
        String targetType,
        BigDecimal disputedAmount,
        BigDecimal refundAmount,
        String bankName,
        String accountName,
        String accountNumber,
        String status,
        String resolutionType,
        String resolutionNote,
        Instant createdAt,
        Instant approvedAt,
        String approvedByName,
        Instant resolvedAt,
        String resolvedByName,
        String transferReference) {
}

