package com.happyprogramming.role.mentor;

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
