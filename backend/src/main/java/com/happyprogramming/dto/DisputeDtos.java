package com.happyprogramming.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public final class DisputeDtos {
    private DisputeDtos() {}

    public record EligibleTarget(
            String targetType, long targetId, String title, String mentorName,
            Instant scheduledAt, BigDecimal amount, String currency) {}

    public record Evidence(
            long id, String fileName, String mimeType, long sizeBytes, Instant createdAt) {}

    public record Summary(
            long id, String ticketCode, String targetType, long targetId, String title,
            String mentorName, Instant scheduledAt, BigDecimal disputedAmount, String currency,
            String category, String status, Instant createdAt) {}

    public record Detail(
            long id, String ticketCode, String targetType, long targetId, String title,
            String mentorName, Instant scheduledAt, BigDecimal disputedAmount, String currency,
            String category, String description, String status, Instant createdAt,
            String resolutionType, String resolutionNote, BigDecimal refundAmount,
            Instant resolvedAt, List<Evidence> evidence,
            String transferReference, String bankName, String accountNumber, String accountName,
            Instant approvedAt) {
        public Detail(long id, String ticketCode, String targetType, long targetId, String title,
                      String mentorName, Instant scheduledAt, BigDecimal disputedAmount, String currency,
                      String category, String description, String status, Instant createdAt,
                      String resolutionType, String resolutionNote, BigDecimal refundAmount,
                      Instant resolvedAt, List<Evidence> evidence) {
            this(id, ticketCode, targetType, targetId, title, mentorName, scheduledAt, disputedAmount, currency,
                 category, description, status, createdAt, resolutionType, resolutionNote, refundAmount,
                 resolvedAt, evidence, null, null, null, null, null);
        }
    }
}
