package com.happyprogramming.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record WorkspaceOneOffBookingDto(
        Long bookingId,
        Long requestId,
        String bookingCode,
        Long serviceId,
        String sessionName,
        String agenda,
        Instant startAt,
        Instant endAt,
        BigDecimal price,
        String currency,
        String status,
        Integer participants,
        Long reviewId,
        Integer reviewRating,
        String reviewComment
) {
    public WorkspaceOneOffBookingDto(
            Long bookingId,
            String bookingCode,
            Long serviceId,
            String sessionName,
            String agenda,
            Instant startAt,
            Instant endAt,
            BigDecimal price,
            String currency,
            String status,
            Integer participants
    ) {
        this(bookingId, null, bookingCode, serviceId, sessionName, agenda, startAt, endAt, price, currency, status, participants, null, null, null);
    }
}
