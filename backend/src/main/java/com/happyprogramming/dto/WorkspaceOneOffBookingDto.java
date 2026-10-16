package com.happyprogramming.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record WorkspaceOneOffBookingDto(
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
) {}
