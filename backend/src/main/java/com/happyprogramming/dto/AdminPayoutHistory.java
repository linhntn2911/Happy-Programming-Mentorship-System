package com.happyprogramming.dto;
import java.math.BigDecimal;
import java.time.Instant;
public record AdminPayoutHistory(long id, long mentorId, String mentorName, String mentorEmail,
    BigDecimal amount, BigDecimal feeAmount, BigDecimal netAmount, String bankName,
    String accountName, String accountNumber, String status, Instant requestedAt,
    Instant reviewedAt, String reviewedBy, String transferReference, String rejectionReason) { }
