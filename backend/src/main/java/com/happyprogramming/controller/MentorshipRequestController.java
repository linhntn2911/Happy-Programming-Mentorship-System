package com.happyprogramming.controller;

import com.happyprogramming.dto.ApiResponse;
import com.happyprogramming.dto.CreateMentorshipRequest;
import com.happyprogramming.dto.MentorshipRequestResponse;
import com.happyprogramming.dto.MenteeApplicationPageDto;
import com.happyprogramming.service.MentorshipRequestService;
import com.happyprogramming.service.VnPayPaymentService;


import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestParam;

@RestController
@CrossOrigin(origins = "*")
public class MentorshipRequestController {
    private final MentorshipRequestService mentorshipRequestService;
    private final VnPayPaymentService vnPayPaymentService;

    public MentorshipRequestController(MentorshipRequestService mentorshipRequestService, VnPayPaymentService vnPayPaymentService) {
        this.mentorshipRequestService = mentorshipRequestService;
        this.vnPayPaymentService = vnPayPaymentService;
    }

    @PostMapping("/api/mentorship-requests")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<MentorshipRequestResponse> createRequest(
            @Valid @RequestBody CreateMentorshipRequest payload) {
        return ApiResponse.ok("Mentorship request submitted.", mentorshipRequestService.create(payload));
    }

    @org.springframework.web.bind.annotation.GetMapping("/api/mentorship-requests/mine")
    public ApiResponse<MenteeApplicationPageDto> getMyApplications(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String status) {
        return ApiResponse.ok(mentorshipRequestService.getMyApplications(page, size, status));
    }

    @org.springframework.web.bind.annotation.PostMapping("/api/mentorship-requests/{id}/cancel")
    public ApiResponse<Void> cancelRequest(
            @org.springframework.web.bind.annotation.PathVariable("id") Long id) {
        mentorshipRequestService.cancelMyRequest(id);
        return ApiResponse.ok("Mentorship application cancelled. You can submit a new application with the current package.", null);
    }

    @org.springframework.web.bind.annotation.GetMapping("/api/mentorship-requests/{id}/checkout-info")
    public ApiResponse<com.happyprogramming.dto.CheckoutInfoDto> getCheckoutInfo(
            @org.springframework.web.bind.annotation.PathVariable("id") Long id) {
        return ApiResponse.ok(mentorshipRequestService.getCheckoutInfo(id));
    }

    @PostMapping("/api/mentorship-requests/{id}/checkout")
    public ApiResponse<com.happyprogramming.dto.CheckoutResponse> checkout(
            @org.springframework.web.bind.annotation.PathVariable("id") Long id,
            jakarta.servlet.http.HttpServletRequest request) {
        return ApiResponse.ok("VNPay payment attempt created.", vnPayPaymentService.initiate(id, request.getRemoteAddr()));
    }
}
