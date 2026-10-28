package com.happyprogramming.controller;

import com.happyprogramming.dto.ApiResponse;
import com.happyprogramming.dto.MentorReviewPage;
import com.happyprogramming.service.MentorReviewService;

import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Validated
@CrossOrigin(origins = "*")
public class MentorReviewController {
    private final MentorReviewService reviewService;

    public MentorReviewController(MentorReviewService reviewService) {
        this.reviewService = reviewService;
    }

    @GetMapping("/api/mentors/me/reviews")
    public ApiResponse<MentorReviewPage> getMyReviews(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ApiResponse.ok(reviewService.getMyReviews(page, size));
    }
}
