package com.happyprogramming.service;

import com.happyprogramming.dto.MentorReviewPage;
import com.happyprogramming.dto.MentorReviewResponse;
import com.happyprogramming.repository.MentorReviewRepository;

import java.math.BigDecimal;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Mentor-facing review management (UC28). Mentors see the aggregate rating and a paginated list of
 * published mentee review cards. This view is read-only: mentors cannot edit or delete reviews
 * (SRS BR-20), so no mutation is offered here.
 */
@Service
public class MentorReviewService {
    private static final int DEFAULT_PAGE_SIZE = 10;
    private static final int MAX_PAGE_SIZE = 50;

    private final MentorService mentorService;
    private final MentorReviewRepository repository;

    public MentorReviewService(MentorService mentorService, MentorReviewRepository repository) {
        this.mentorService = mentorService;
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public MentorReviewPage getMyReviews(int page, int size) {
        long mentorId = mentorService.currentActiveMentorUserId();
        int safePage = Math.max(page, 0);
        int safeSize = size <= 0 ? DEFAULT_PAGE_SIZE : Math.min(size, MAX_PAGE_SIZE);

        long reviewCount = repository.countPublishedReviews(mentorId);
        BigDecimal averageRating = reviewCount == 0 ? null : repository.findAverageRating(mentorId);

        List<MentorReviewResponse> items =
                (long) safePage * safeSize >= reviewCount
                        ? List.of()
                        : repository.findPublishedReviews(mentorId, safePage * safeSize, safeSize);

        return new MentorReviewPage(averageRating, reviewCount, safePage, safeSize, items);
    }
}
