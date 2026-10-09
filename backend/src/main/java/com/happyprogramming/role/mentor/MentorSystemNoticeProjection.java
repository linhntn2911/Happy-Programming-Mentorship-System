package com.happyprogramming.role.mentor;

import java.time.LocalDateTime;

public interface MentorSystemNoticeProjection {
    String getId();

    String getType();

    Long getRequestId();

    String getMenteeName();

    String getStatus();

    LocalDateTime getOccurredAt();

    LocalDateTime getCompletedAt();

    String getMessage();
}
