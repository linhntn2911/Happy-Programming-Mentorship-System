package com.happyprogramming.dto;

import java.math.BigDecimal;
import java.util.List;

/**
 * Paginated mentor review page (UC28): the aggregate rating summary plus the current page of
 * published review cards. {@code reviewCount} is the total number of published reviews.
 */
public record MentorReviewPage(
        BigDecimal averageRating,
        long reviewCount,
        int page,
        int pageSize,
        List<MentorReviewResponse> items) {
}
