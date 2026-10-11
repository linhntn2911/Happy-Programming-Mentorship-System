package com.happyprogramming.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record MentorWalletResponse(
        BigDecimal heldAmount,
        BigDecimal availableAmount,
        BigDecimal reservedAmount,
        BigDecimal paidOutAmount,
        List<Entry> entries,
        List<PayoutRequest> payoutRequests) {
    public record Entry(long id, String type, BigDecimal amount, String reference, Instant createdAt) { }
    public record PayoutRequest(long id, BigDecimal amount, String bankName, String accountName,
                                String accountLast4, String status, String transferReference,
                                String rejectionReason, Instant requestedAt, Instant reviewedAt) { }
}
