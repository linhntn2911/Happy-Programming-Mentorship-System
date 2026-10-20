package com.happyprogramming.service;

import com.happyprogramming.dto.AuthenticatedUser;
import com.happyprogramming.dto.CreateReviewRequest;
import com.happyprogramming.dto.PublicReviewDto;
import com.happyprogramming.dto.ReviewResponseDto;
import com.happyprogramming.repository.ReviewRepository;
import com.happyprogramming.repository.ReviewRepository.BookingReviewContext;
import com.happyprogramming.repository.ReviewRepository.PublicReviewRecord;
import com.happyprogramming.repository.ReviewRepository.ReviewEntity;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReviewServiceTest {

    @Mock ReviewRepository reviewRepository;
    @Mock NotificationService notificationService;

    ReviewService reviewService;
    Clock fixedClock;
    Instant now;

    @BeforeEach
    void setUp() {
        now = Instant.parse("2026-10-16T12:00:00Z");
        fixedClock = Clock.fixed(now, ZoneOffset.UTC);
        reviewService = new ReviewService(reviewRepository, notificationService, fixedClock);

        var user = new AuthenticatedUser(100L, "John Mentee", "mentee@example.com", "MENTEE", Set.of("MENTEE"));
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user, null, List.of()));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    // 34. submitReview_01
    @Test
    void submitReview_successful_whenSessionCompleted() {
        BookingReviewContext booking = new BookingReviewContext(
                50L, "ONEOFF-1-1", 200L, 100L, "COMPLETED",
                now.minusSeconds(7200), now.minusSeconds(3600), now.minusSeconds(3600),
                "Code Review", "Jane Mentor", "John Mentee"
        );
        when(reviewRepository.findBookingForReview(50L)).thenReturn(Optional.of(booking));
        when(reviewRepository.existsByBookingId(50L)).thenReturn(false);
        when(reviewRepository.insertBookingReview(50L, 5, "Excellent mentorship session! Learned so much."))
                .thenReturn(10L);

        CreateReviewRequest request = new CreateReviewRequest(50L, 5, "Excellent mentorship session! Learned so much.");
        ReviewResponseDto result = reviewService.submitReview(request);

        assertNotNull(result);
        assertEquals(10L, result.id());
        assertEquals(50L, result.bookingId());
        assertEquals(5, result.rating());
        assertEquals("Excellent mentorship session! Learned so much.", result.comment());
        assertEquals("PUBLISHED", result.visibilityStatus());

        verify(notificationService).create(
                eq(200L),
                eq("New review received"),
                eq("John Mentee left a 5-star review for \"Code Review\"."),
                eq("REVIEW_RECEIVED"),
                eq("#/mentor/dashboard")
        );
    }

    // 35. submitReview_02
    @Test
    void submitReview_successful_whenSessionConfirmedAndEnded() {
        BookingReviewContext booking = new BookingReviewContext(
                51L, "ONEOFF-2-1", 200L, 100L, "CONFIRMED",
                now.minusSeconds(3600), now.minusSeconds(600), null,
                "Architecture Design", "Jane Mentor", "John Mentee"
        );
        when(reviewRepository.findBookingForReview(51L)).thenReturn(Optional.of(booking));
        when(reviewRepository.existsByBookingId(51L)).thenReturn(false);
        when(reviewRepository.insertBookingReview(51L, 4, "Great session with clear actionable guidance."))
                .thenReturn(11L);

        CreateReviewRequest request = new CreateReviewRequest(51L, 4, "Great session with clear actionable guidance.");
        ReviewResponseDto result = reviewService.submitReview(request);

        assertNotNull(result);
        assertEquals(11L, result.id());
        verify(reviewRepository).markBookingCompleted(51L, now.minusSeconds(600));
    }

    // 36. submitReview_03
    @Test
    void submitReview_fails_whenDuplicateReviewSubmitted() {
        BookingReviewContext booking = new BookingReviewContext(
                50L, "ONEOFF-1-1", 200L, 100L, "COMPLETED",
                now.minusSeconds(7200), now.minusSeconds(3600), now.minusSeconds(3600),
                "Code Review", "Jane Mentor", "John Mentee"
        );
        when(reviewRepository.findBookingForReview(50L)).thenReturn(Optional.of(booking));
        when(reviewRepository.existsByBookingId(50L)).thenReturn(true);

        CreateReviewRequest request = new CreateReviewRequest(50L, 5, "Another attempt to review this session.");
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> reviewService.submitReview(request));

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
        assertEquals("This booking has already been reviewed.", ex.getReason());
        verify(reviewRepository, never()).insertBookingReview(anyLong(), anyInt(), anyString());
    }

    // 37. submitReview_04
    @Test
    void submitReview_fails_whenSessionNotCompletedYet() {
        BookingReviewContext booking = new BookingReviewContext(
                52L, "ONEOFF-3-1", 200L, 100L, "CONFIRMED",
                now.plusSeconds(3600), now.plusSeconds(7200), null,
                "Future Session", "Jane Mentor", "John Mentee"
        );
        when(reviewRepository.findBookingForReview(52L)).thenReturn(Optional.of(booking));

        CreateReviewRequest request = new CreateReviewRequest(52L, 5, "Premature review for future booking.");
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> reviewService.submitReview(request));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertEquals("You can only review a completed session.", ex.getReason());
    }

    // 38. submitReview_05
    @Test
    void submitReview_fails_whenNotBookingOwner() {
        BookingReviewContext booking = new BookingReviewContext(
                50L, "ONEOFF-1-1", 200L, 999L, "COMPLETED",
                now.minusSeconds(7200), now.minusSeconds(3600), now.minusSeconds(3600),
                "Code Review", "Jane Mentor", "Other Mentee"
        );
        when(reviewRepository.findBookingForReview(50L)).thenReturn(Optional.of(booking));

        CreateReviewRequest request = new CreateReviewRequest(50L, 5, "Reviewing someone else session.");
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> reviewService.submitReview(request));

        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
        assertEquals("You can only review your own bookings.", ex.getReason());
    }

    // 39. submitReview_06
    @Test
    void submitReview_fails_whenRatingInvalid() {
        CreateReviewRequest request = new CreateReviewRequest(50L, 6, "Invalid rating of 6 stars.");
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> reviewService.submitReview(request));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertEquals("Rating must be between 1 and 5.", ex.getReason());
    }

    // 40. submitReview_07
    @Test
    void submitReview_fails_whenCommentTooShort() {
        CreateReviewRequest request = new CreateReviewRequest(50L, 5, "Short");
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> reviewService.submitReview(request));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertEquals("Review comment must be between 10 and 500 characters.", ex.getReason());
    }

    // 41. getPublishedReviews_01
    @Test
    void getPublicReviewsForMentor_returnsPublishedReviews() {
        when(reviewRepository.resolveMentorId("jane-mentor")).thenReturn(200L);
        when(reviewRepository.findPublishedReviewsByMentorId(200L, 10)).thenReturn(List.of(
                new PublicReviewRecord(1L, 5, "Super insightful feedback!", "John Mentee", "Code Review", now.minusSeconds(1000))
        ));

        List<PublicReviewDto> list = reviewService.getPublicReviewsForMentor("jane-mentor", 10);
        assertEquals(1, list.size());
        assertEquals(5, list.get(0).rating());
        assertEquals("Super insightful feedback!", list.get(0).comment());
        assertEquals("John Mentee", list.get(0).menteeName());
    }
}
