package vn.happyprogramming.mentor;

import java.time.LocalDateTime;

public interface MentorRequestDecisionProjection {
    Long getId();

    String getStatus();

    LocalDateTime getRespondedAt();
}
