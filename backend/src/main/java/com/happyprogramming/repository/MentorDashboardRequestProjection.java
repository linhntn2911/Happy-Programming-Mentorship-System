package com.happyprogramming.repository;

import java.time.LocalDateTime;

public interface MentorDashboardRequestProjection {
    Long getId();

    String getMenteeName();

    String getPackageName();

    String getLearningGoals();

    String getStatus();

    LocalDateTime getSubmittedAt();

    LocalDateTime getResponseDeadline();
}
