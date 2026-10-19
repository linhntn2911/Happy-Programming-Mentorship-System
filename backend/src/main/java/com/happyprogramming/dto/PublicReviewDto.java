package com.happyprogramming.dto;

import java.time.Instant;

public record PublicReviewDto(
        Long id,
        Integer rating,
        String comment,
        String menteeName,
        String sessionName,
        Instant createdAt
) {}
