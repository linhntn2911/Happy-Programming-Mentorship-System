package com.happyprogramming.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateReviewRequest(
        @NotNull(message = "Booking ID is required.")
        Long bookingId,

        @NotNull(message = "Rating is required.")
        @Min(value = 1, message = "Rating must be between 1 and 5.")
        @Max(value = 5, message = "Rating must be between 1 and 5.")
        Integer rating,

        @NotBlank(message = "Review comment is required.")
        @Size(min = 10, max = 500, message = "Review comment must be between 10 and 500 characters.")
        String comment
) {}
