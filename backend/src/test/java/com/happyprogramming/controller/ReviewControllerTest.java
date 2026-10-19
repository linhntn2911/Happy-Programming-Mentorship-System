package com.happyprogramming.controller;

import com.happyprogramming.dto.CreateReviewRequest;
import com.happyprogramming.dto.PublicReviewDto;
import com.happyprogramming.dto.ReviewResponseDto;
import com.happyprogramming.service.ReviewService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ReviewController.class)
@AutoConfigureMockMvc(addFilters = false)
class ReviewControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ReviewService reviewService;

    @MockitoBean
    private com.happyprogramming.service.StaffAccessService staffAccess;

    @Test
    void submitReview_success() throws Exception {
        ReviewResponseDto responseDto = new ReviewResponseDto(
                10L, 50L, 5, "Great session, very helpful!", "PUBLISHED",
                Instant.parse("2026-10-16T12:00:00Z"), "John Mentee", "Code Review"
        );
        when(reviewService.submitReview(any(CreateReviewRequest.class))).thenReturn(responseDto);

        mockMvc.perform(post("/api/reviews")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "bookingId": 50,
                                  "rating": 5,
                                  "comment": "Great session, very helpful!"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(10))
                .andExpect(jsonPath("$.data.rating").value(5))
                .andExpect(jsonPath("$.data.comment").value("Great session, very helpful!"));
    }

    @Test
    void submitReview_validationFailure_whenCommentTooShort() throws Exception {
        mockMvc.perform(post("/api/reviews")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "bookingId": 50,
                                  "rating": 5,
                                  "comment": "Too short"
                                }
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void submitReview_conflict_whenAlreadyReviewed() throws Exception {
        when(reviewService.submitReview(any(CreateReviewRequest.class)))
                .thenThrow(new ResponseStatusException(HttpStatus.CONFLICT, "This booking has already been reviewed."));

        mockMvc.perform(post("/api/reviews")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "bookingId": 50,
                                  "rating": 5,
                                  "comment": "Great session, very helpful!"
                                }
                                """))
                .andExpect(status().isConflict());
    }

    @Test
    void getBookingReview_success() throws Exception {
        ReviewResponseDto responseDto = new ReviewResponseDto(
                10L, 50L, 5, "Great session, very helpful!", "PUBLISHED",
                Instant.parse("2026-10-16T12:00:00Z"), "John Mentee", "Code Review"
        );
        when(reviewService.getBookingReview(50L)).thenReturn(responseDto);

        mockMvc.perform(get("/api/bookings/50/review"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(10))
                .andExpect(jsonPath("$.data.rating").value(5));
    }

    @Test
    void getMentorReviews_success() throws Exception {
        when(reviewService.getPublicReviewsForMentor(eq("jane-mentor"), eq(10))).thenReturn(List.of(
                new PublicReviewDto(1L, 5, "Exceptional guidance!", "John Mentee", "Code Review", Instant.parse("2026-10-16T10:00:00Z"))
        ));

        mockMvc.perform(get("/api/mentors/jane-mentor/reviews?limit=10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].id").value(1))
                .andExpect(jsonPath("$.data[0].rating").value(5))
                .andExpect(jsonPath("$.data[0].comment").value("Exceptional guidance!"));
    }
}
