package com.happyprogramming.repository;

import java.time.LocalDateTime;

public interface MentorDashboardRequestProjection {
    Long getId();

    String getMenteeName();

    String getPackageName();

    String getServiceType();

    String getLearningGoals();

    String getStatus();

    String getLifecycleStatus();

    LocalDateTime getSubmittedAt();

    LocalDateTime getResponseDeadline();

    LocalDateTime getStartAt();

    LocalDateTime getEndAt();

    Integer getNumberOfSessions();

    Integer getNumberOfParticipants();
}
