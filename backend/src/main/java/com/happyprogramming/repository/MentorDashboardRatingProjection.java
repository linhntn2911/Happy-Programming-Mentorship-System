package com.happyprogramming.repository;

import java.math.BigDecimal;

public interface MentorDashboardRatingProjection {
    BigDecimal getAverageRating();

    long getReviewCount();
}
