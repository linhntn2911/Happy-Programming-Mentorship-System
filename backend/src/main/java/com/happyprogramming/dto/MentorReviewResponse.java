package com.happyprogramming.dto;

import java.time.Instant;

/**
 * A single published mentee review card rendered for the owning mentor (UC28). Read-only: mentors
 * cannot edit or delete mentee reviews (SRS BR-20). {@code packageType} is the originating offering
 * type ({@code MONTHLY} or {@code ONE_OFF}); subscription-linked reviews are monthly.
 */
public record MentorReviewResponse(
        long id,
        int rating,
        String comment,
        String menteeName,
        String sessionLabel,
        String packageType,
        Instant createdAt) {
}
