package com.happyprogramming.dto;

import java.time.Instant;

public record MentorDashboardRequest(
        Long id,
        String menteeName,
        String packageName,
        String serviceType,
        String learningGoals,
        String learningGoalsSummary,
        String status,
        String lifecycleStatus,
        Instant submittedAt,
        Instant responseDeadline,
        Instant startAt,
        Instant endAt,
        Integer numberOfSessions,
        Integer numberOfParticipants) {
}
