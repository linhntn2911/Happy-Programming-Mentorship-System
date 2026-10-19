package com.happyprogramming.service;

import com.happyprogramming.dto.AuthenticatedUser;
import com.happyprogramming.dto.CreateReviewRequest;
import com.happyprogramming.dto.PublicReviewDto;
import com.happyprogramming.dto.ReviewResponseDto;
import com.happyprogramming.repository.ReviewRepository;
import com.happyprogramming.repository.ReviewRepository.BookingReviewContext;
import com.happyprogramming.repository.ReviewRepository.ReviewEntity;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.Instant;
import java.util.List;

@Service
public class ReviewService {
    private final ReviewRepository reviewRepository;
    private final NotificationService notificationService;
    private final Clock clock;

    @Autowired
    public ReviewService(ReviewRepository reviewRepository, NotificationService notificationService,
                         @Autowired(required = false) Clock clock) {
        this.reviewRepository = reviewRepository;
        this.notificationService = notificationService;
        this.clock = clock != null ? clock : Clock.systemUTC();
    }

    public ReviewService(ReviewRepository reviewRepository, NotificationService notificationService) {
        this(reviewRepository, notificationService, Clock.systemUTC());
    }

    @Transactional
    public ReviewResponseDto submitReview(CreateReviewRequest payload) {
        AuthenticatedUser user = currentUser();
        if (user == null || user.id() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please log in to submit a review.");
        }
        if (user.roles() == null || !user.roles().contains("MENTEE")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only mentees can submit session reviews.");
        }

        if (payload.rating() == null || payload.rating() < 1 || payload.rating() > 5) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Rating must be between 1 and 5.");
        }
        String comment = payload.comment() == null ? "" : payload.comment().trim();
        if (comment.length() < 10 || comment.length() > 500) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Review comment must be between 10 and 500 characters.");
        }

        BookingReviewContext booking = reviewRepository.findBookingForReview(payload.bookingId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found."));

        if (booking.menteeId() != user.id()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only review your own bookings.");
        }

        Instant now = Instant.now(clock);
        boolean isCompleted = "COMPLETED".equalsIgnoreCase(booking.status())
                || ("CONFIRMED".equalsIgnoreCase(booking.status()) && booking.endAt() != null && !booking.endAt().isAfter(now));

        if (!isCompleted) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "You can only review a completed session.");
        }

        if (reviewRepository.existsByBookingId(payload.bookingId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This booking has already been reviewed.");
        }

        if ("CONFIRMED".equalsIgnoreCase(booking.status())) {
            reviewRepository.markBookingCompleted(booking.bookingId(), booking.endAt() != null ? booking.endAt() : now);
        }

        long reviewId = reviewRepository.insertBookingReview(booking.bookingId(), payload.rating(), comment);

        String menteeName = user.name() != null && !user.name().isBlank() ? user.name() : "Your mentee";
        notificationService.create(
                booking.mentorId(),
                "New review received",
                menteeName + " left a " + payload.rating() + "-star review for \"" + booking.sessionName() + "\".",
                "REVIEW_RECEIVED",
                "#/mentor/dashboard"
        );

        return new ReviewResponseDto(
                reviewId,
                booking.bookingId(),
                payload.rating(),
                comment,
                "PUBLISHED",
                now,
                booking.menteeName(),
                booking.sessionName()
        );
    }

    @Transactional(readOnly = true)
    public ReviewResponseDto getBookingReview(long bookingId) {
        AuthenticatedUser user = currentUser();
        if (user == null || user.id() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please log in to view reviews.");
        }

        BookingReviewContext booking = reviewRepository.findBookingForReview(bookingId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found."));

        if (booking.menteeId() != user.id() && booking.mentorId() != user.id()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied.");
        }

        ReviewEntity review = reviewRepository.findReviewByBookingId(bookingId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Review not found for this booking."));

        return new ReviewResponseDto(
                review.id(),
                review.bookingId(),
                review.rating(),
                review.comment(),
                review.visibilityStatus(),
                review.createdAt(),
                review.menteeName(),
                review.sessionName()
        );
    }

    @Transactional(readOnly = true)
    public List<PublicReviewDto> getPublicReviewsForMentor(String identifier, int limit) {
        Long mentorId = reviewRepository.resolveMentorId(identifier);
        if (mentorId == null) {
            return List.of();
        }
        int safeLimit = Math.max(1, Math.min(limit, 50));
        return reviewRepository.findPublishedReviewsByMentorId(mentorId, safeLimit).stream()
                .map(row -> new PublicReviewDto(
                        row.id(),
                        row.rating(),
                        row.comment(),
                        row.menteeName(),
                        row.sessionName(),
                        row.createdAt()
                )).toList();
    }

    private AuthenticatedUser currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && auth.getPrincipal() instanceof AuthenticatedUser user) {
            return user;
        }
        return null;
    }
}
