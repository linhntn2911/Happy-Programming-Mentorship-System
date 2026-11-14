package com.happyprogramming.dto;

import java.time.Instant;

public record MentorDashboardRequest(
        Long id,
        Long menteeId,
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
        Integer numberOfParticipants,
        String rejectionReason) {

    public MentorDashboardRequest(
            Long id,
            Long menteeId,
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
        this(id, menteeId, menteeName, packageName, serviceType, learningGoals, learningGoalsSummary,
                status, lifecycleStatus, submittedAt, responseDeadline, startAt, endAt,
                numberOfSessions, numberOfParticipants, null);
    }
}

