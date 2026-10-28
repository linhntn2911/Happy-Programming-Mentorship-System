package com.happyprogramming.service;

import com.happyprogramming.dto.MentorReviewPage;
import com.happyprogramming.dto.MentorReviewResponse;
import com.happyprogramming.repository.MentorReviewRepository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class MentorReviewServiceTest {
    @Mock
    private MentorService mentorService;
    @Mock
    private MentorReviewRepository repository;

    private MentorReviewService service;

    @BeforeEach
    void setUp() {
        service = new MentorReviewService(mentorService, repository);
        when(mentorService.currentActiveMentorUserId()).thenReturn(42L);
    }

    private static MentorReviewResponse card(long id) {
        return new MentorReviewResponse(id, 5, "Clear and dedicated mentor.", "Mentee A",
                "Monthly Mentorship", Instant.parse("2026-10-10T03:15:00Z"));
    }

    @Test
    void returnsSummaryAndCurrentPage() {
        when(repository.countPublishedReviews(42L)).thenReturn(12L);
        when(repository.findAverageRating(42L)).thenReturn(new BigDecimal("4.50"));
        when(repository.findPublishedReviews(42L, 0, 5)).thenReturn(List.of(card(1L), card(2L)));

        MentorReviewPage page = service.getMyReviews(0, 5);

        assertEquals(0, page.page());
        assertEquals(5, page.pageSize());
        assertEquals(12L, page.reviewCount());
        assertEquals(new BigDecimal("4.50"), page.averageRating());
        assertEquals(2, page.items().size());
    }

    @Test
    void clampsNegativePageAndDefaultSize() {
        when(repository.countPublishedReviews(42L)).thenReturn(3L);
        when(repository.findAverageRating(42L)).thenReturn(new BigDecimal("5.00"));
        when(repository.findPublishedReviews(42L, 0, 10)).thenReturn(List.of(card(1L)));

        MentorReviewPage page = service.getMyReviews(-4, 0);

        assertEquals(0, page.page());
        assertEquals(10, page.pageSize());
        verify(repository).findPublishedReviews(42L, 0, 10);
    }

    @Test
    void capsPageSizeAtMaximum() {
        when(repository.countPublishedReviews(42L)).thenReturn(80L);
        when(repository.findAverageRating(42L)).thenReturn(new BigDecimal("4.00"));
        when(repository.findPublishedReviews(42L, 0, 50)).thenReturn(List.of(card(1L)));

        MentorReviewPage page = service.getMyReviews(0, 500);

        assertEquals(50, page.pageSize());
        verify(repository).findPublishedReviews(42L, 0, 50);
    }

    @Test
    void returnsEmptySummaryWithoutQueryingItemsWhenNoReviews() {
        when(repository.countPublishedReviews(42L)).thenReturn(0L);

        MentorReviewPage page = service.getMyReviews(0, 10);

        assertNull(page.averageRating());
        assertEquals(0L, page.reviewCount());
        assertTrue(page.items().isEmpty());
        verify(repository, never()).findAverageRating(anyLong());
        verify(repository, never()).findPublishedReviews(anyLong(), anyInt(), anyInt());
    }

    @Test
    void returnsEmptyItemsWhenPageIsBeyondTotal() {
        when(repository.countPublishedReviews(42L)).thenReturn(12L);
        when(repository.findAverageRating(42L)).thenReturn(new BigDecimal("4.50"));

        MentorReviewPage page = service.getMyReviews(5, 10);

        assertTrue(page.items().isEmpty());
        verify(repository, never()).findPublishedReviews(anyLong(), anyInt(), anyInt());
    }
}
