package com.happyprogramming.controller;

import com.happyprogramming.dto.MentorReviewPage;
import com.happyprogramming.dto.MentorReviewResponse;
import com.happyprogramming.service.MentorReviewService;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(MentorReviewController.class)
@AutoConfigureMockMvc(addFilters = false)
class MentorReviewControllerTest {
    @MockitoBean
    private com.happyprogramming.service.StaffAccessService staffAccess;
    @MockitoBean
    private MentorReviewService reviews;
    @Autowired
    private MockMvc mockMvc;

    private static MentorReviewPage page(int page, int pageSize) {
        return new MentorReviewPage(new BigDecimal("4.50"), 12L, page, pageSize, List.of(
                new MentorReviewResponse(101L, 5, "Very dedicated and clear explanations.",
                        "Nguyen Van A", "Monthly Mentorship — Backend",
                        Instant.parse("2026-10-10T03:15:00Z"))));
    }

    @Test
    void getMyReviewsReturnsSummaryAndCards() throws Exception {
        when(reviews.getMyReviews(0, 10)).thenReturn(page(0, 10));

        mockMvc.perform(get("/api/mentors/me/reviews").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.averageRating").value(4.50))
                .andExpect(jsonPath("$.data.reviewCount").value(12))
                .andExpect(jsonPath("$.data.items[0].id").value(101))
                .andExpect(jsonPath("$.data.items[0].rating").value(5))
                .andExpect(jsonPath("$.data.items[0].menteeName").value("Nguyen Van A"))
                .andExpect(jsonPath("$.data.items[0].createdAt").value("2026-10-10T03:15:00Z"));
    }

    @Test
    void getMyReviewsUsesDefaultPaging() throws Exception {
        when(reviews.getMyReviews(0, 10)).thenReturn(page(0, 10));

        mockMvc.perform(get("/api/mentors/me/reviews").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());

        verify(reviews).getMyReviews(0, 10);
    }

    @Test
    void getMyReviewsHonorsPagingParams() throws Exception {
        when(reviews.getMyReviews(2, 5)).thenReturn(page(2, 5));

        mockMvc.perform(get("/api/mentors/me/reviews").param("page", "2").param("size", "5")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.page").value(2))
                .andExpect(jsonPath("$.data.pageSize").value(5));

        verify(reviews).getMyReviews(2, 5);
    }
}
