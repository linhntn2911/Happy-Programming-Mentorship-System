package com.happyprogramming.dto;

import java.time.Instant;

public record ReviewResponseDto(
        Long id,
        Long bookingId,
        Integer rating,
        String comment,
        String visibilityStatus,
        Instant createdAt,
        String menteeName,
        String sessionName
) {}
