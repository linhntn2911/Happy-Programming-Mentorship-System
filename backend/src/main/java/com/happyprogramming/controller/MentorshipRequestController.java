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
}
