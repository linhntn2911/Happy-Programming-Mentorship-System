package com.happyprogramming.controller;

import com.happyprogramming.dto.ApiResponse;
import com.happyprogramming.dto.CreateReviewRequest;
import com.happyprogramming.dto.PublicReviewDto;
import com.happyprogramming.dto.ReviewResponseDto;
import com.happyprogramming.service.ReviewService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class ReviewController {
    private final ReviewService reviewService;

    public ReviewController(ReviewService reviewService) {
        this.reviewService = reviewService;
    }

    @PostMapping("/api/reviews")
    public ApiResponse<ReviewResponseDto> submitReview(@Valid @RequestBody CreateReviewRequest payload) {
        return ApiResponse.ok("Review submitted successfully.", reviewService.submitReview(payload));
    }

    @GetMapping("/api/bookings/{bookingId}/review")
    public ApiResponse<ReviewResponseDto> getBookingReview(@PathVariable Long bookingId) {
        return ApiResponse.ok(reviewService.getBookingReview(bookingId));
    }

    @GetMapping("/api/mentors/{identifier}/reviews")
    public ApiResponse<List<PublicReviewDto>> getMentorReviews(
            @PathVariable String identifier,
            @RequestParam(defaultValue = "10") int limit) {
        return ApiResponse.ok(reviewService.getPublicReviewsForMentor(identifier, limit));
    }
}
