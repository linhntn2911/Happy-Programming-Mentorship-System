package com.happyprogramming.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public final class StaffDisputeDtos {
    private StaffDisputeDtos() {}

    public record StaffSummary(
            long id,
            String ticketCode,
            String targetType,
            long targetId,
            String title,
            String complainantName,
            String complainantEmail,
            String respondentName,
            String respondentEmail,
            Instant scheduledAt,
            BigDecimal disputedAmount,
            String currency,
            String category,
            String status,
            Instant createdAt,
            Long assignedStaffId,
            String assignedStaffName
    ) {}

    public record StaffDetail(
            long id,
            String ticketCode,
            String targetType,
            long targetId,
            String title,
            long complainantId,
            String complainantName,
            String complainantEmail,
            long respondentId,
            String respondentName,
            String respondentEmail,
            Instant scheduledAt,
            BigDecimal disputedAmount,
            String currency,
            String category,
            String description,
            String status,
            Instant createdAt,
            Instant termsAcceptedAt,
            Long assignedStaffId,
            String assignedStaffName,
            Instant responseDeadlineAt,
            String resolutionType,
            String resolutionNote,
            BigDecimal refundAmount,
            Instant resolvedAt,
            List<DisputeDtos.Evidence> evidence
    ) {}

    public record ResolveRequest(
            @NotBlank(message = "Resolution type is required.")
            @Pattern(regexp = "FULL_REFUND|PARTIAL_REFUND|RESCHEDULE|REJECTED", message = "Invalid resolution type.")
            String resolutionType,

            @NotBlank(message = "Resolution note is required.")
            @Size(min = 10, max = 2000, message = "Resolution note must be between 10 and 2,000 characters.")
            String resolutionNote,

            BigDecimal refundAmount
    ) {}
}
