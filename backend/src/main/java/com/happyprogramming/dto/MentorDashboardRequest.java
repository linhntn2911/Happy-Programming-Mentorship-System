package com.happyprogramming.dto;

import java.time.Instant;

public record MentorDashboardRequest(
        Long id,
        String menteeName,
        String packageName,
        String learningGoals,
        String learningGoalsSummary,
        String status,
        Instant submittedAt,
        Instant responseDeadline) {
}
