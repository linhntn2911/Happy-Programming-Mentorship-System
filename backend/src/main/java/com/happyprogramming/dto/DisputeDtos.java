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
            Instant resolvedAt, List<Evidence> evidence) {}
}
