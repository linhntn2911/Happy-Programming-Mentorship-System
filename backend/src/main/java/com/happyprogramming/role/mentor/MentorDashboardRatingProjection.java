package com.happyprogramming.role.mentor;

import java.math.BigDecimal;

public interface MentorDashboardRatingProjection {
    BigDecimal getAverageRating();

    long getReviewCount();
}
