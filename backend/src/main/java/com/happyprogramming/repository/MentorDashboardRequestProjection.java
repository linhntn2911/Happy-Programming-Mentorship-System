package com.happyprogramming.repository;

import java.time.LocalDateTime;

public interface MentorDashboardRequestProjection {
    Long getId();

    Long getMenteeId();

    String getMenteeName();

    String getPackageName();

    String getServiceType();

    String getLearningGoals();

    String getStatus();

    String getLifecycleStatus();

    String getRejectionReason();

    LocalDateTime getSubmittedAt();

    LocalDateTime getResponseDeadline();

    LocalDateTime getStartAt();

    LocalDateTime getEndAt();

    Integer getNumberOfSessions();

    Integer getNumberOfParticipants();

    String getExperienceLevel();

    String getBackground();

    String getExpectations();

    String getMenteeEmail();
}
