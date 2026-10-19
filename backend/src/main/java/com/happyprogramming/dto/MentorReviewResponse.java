package com.happyprogramming.dto;

import java.time.Instant;

/**
 * A single published mentee review card rendered for the owning mentor (UC28). Read-only: mentors
 * cannot edit or delete mentee reviews (SRS BR-20).
 */
public record MentorReviewResponse(
        long id,
        int rating,
        String comment,
        String menteeName,
        String sessionLabel,
        Instant createdAt) {
}
