package vn.happyprogramming.mentor;

import java.math.BigDecimal;

public record MentorDashboardSummary(
        BigDecimal netEarnings,
        String currency,
        long pendingInvitations,
        BigDecimal averageRating,
        long reviewCount) {
}
