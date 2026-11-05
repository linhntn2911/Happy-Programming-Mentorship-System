package com.happyprogramming.controller;

import com.happyprogramming.dto.ApiResponse;
import com.happyprogramming.dto.CheckoutInfoDto;
import com.happyprogramming.dto.CheckoutResponse;
import com.happyprogramming.dto.CreateMentorshipRequest;
import com.happyprogramming.dto.CreateOneOffSessionRequest;
import com.happyprogramming.dto.MenteeApplicationPageDto;
import com.happyprogramming.dto.MentorshipRequestResponse;
import com.happyprogramming.service.MentorshipRequestService;
import com.happyprogramming.service.SepayPaymentService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@CrossOrigin(origins = "*")
public class MentorshipRequestController {
    private final MentorshipRequestService mentorshipRequestService;
    private final SepayPaymentService sepayPaymentService;

    @Autowired
    public MentorshipRequestController(
            MentorshipRequestService mentorshipRequestService,
            SepayPaymentService sepayPaymentService) {
        this.mentorshipRequestService = mentorshipRequestService;
        this.sepayPaymentService = sepayPaymentService;
    }

    @PostMapping("/api/mentorship-requests")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<MentorshipRequestResponse> createRequest(
            @Valid @RequestBody CreateMentorshipRequest payload) {
        return ApiResponse.ok("Mentorship request submitted.", mentorshipRequestService.create(payload));
    }

    @PostMapping("/api/one-off-requests")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<MentorshipRequestResponse> createOneOffRequest(
            @Valid @RequestBody CreateOneOffSessionRequest payload) {
        return ApiResponse.ok("One-off session request submitted.", mentorshipRequestService.createOneOff(payload));
    }

    @GetMapping("/api/mentorship-requests/mine")
    public ApiResponse<MenteeApplicationPageDto> getMyApplications(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String status) {
        return ApiResponse.ok(mentorshipRequestService.getMyApplications(page, size, status));
    }

    @PostMapping("/api/mentorship-requests/{id}/cancel")
    public ApiResponse<Void> cancelRequest(
            @PathVariable("id") Long id) {
        mentorshipRequestService.cancelMyRequest(id);
        return ApiResponse.ok("Mentorship application cancelled. You can submit a new application with the current package.", null);
    }

    @GetMapping("/api/mentorship-requests/{id}/checkout-info")
    public ApiResponse<CheckoutInfoDto> getCheckoutInfo(
            @PathVariable("id") Long id) {
        return ApiResponse.ok(mentorshipRequestService.getCheckoutInfo(id));
    }

    @PostMapping("/api/mentorship-requests/{id}/checkout")
    public ApiResponse<CheckoutResponse> checkout(
            @PathVariable("id") Long id) {
        return ApiResponse.ok("SePay QR payment attempt created.", sepayPaymentService.initiate(id));
    }
}
