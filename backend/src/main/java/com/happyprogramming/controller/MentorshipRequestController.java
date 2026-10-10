package com.happyprogramming.controller;

import com.happyprogramming.dto.ApiResponse;
import com.happyprogramming.dto.CreateMentorshipRequest;
import com.happyprogramming.dto.MentorshipRequestResponse;
import com.happyprogramming.service.MentorshipRequestService;


import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@CrossOrigin(origins = "*")
public class MentorshipRequestController {
    private final MentorshipRequestService mentorshipRequestService;

    public MentorshipRequestController(MentorshipRequestService mentorshipRequestService) {
        this.mentorshipRequestService = mentorshipRequestService;
    }

    @PostMapping("/api/mentorship-requests")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<MentorshipRequestResponse> createRequest(
            @Valid @RequestBody CreateMentorshipRequest payload) {
        return ApiResponse.ok("Mentorship request submitted.", mentorshipRequestService.create(payload));
    }

    @org.springframework.web.bind.annotation.GetMapping("/api/mentorship-requests/{id}/checkout-info")
    public ApiResponse<com.happyprogramming.dto.CheckoutInfoDto> getCheckoutInfo(
            @org.springframework.web.bind.annotation.PathVariable("id") Long id) {
        return ApiResponse.ok(mentorshipRequestService.getCheckoutInfo(id));
    }

    @PostMapping("/api/mentorship-requests/{id}/checkout")
    public ApiResponse<com.happyprogramming.dto.CheckoutResponse> checkout(
            @org.springframework.web.bind.annotation.PathVariable("id") Long id,
            @RequestBody(required = false) com.happyprogramming.dto.CheckoutRequest payload) {
        return ApiResponse.ok("Payment processed successfully.", mentorshipRequestService.processCheckout(id, payload));
    }
}
