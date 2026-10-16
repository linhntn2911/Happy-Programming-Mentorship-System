package com.happyprogramming.controller;

import com.happyprogramming.dto.ApiResponse;
import com.happyprogramming.dto.MentorPlanResponse;
import com.happyprogramming.dto.MentorPlanSetRequest;
import com.happyprogramming.dto.MentorOneOffSessionSetRequest;
import com.happyprogramming.service.MentorPlanService;


import jakarta.validation.Valid;
import java.util.List;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Validated
@CrossOrigin(origins = "*")
public class MentorPlanController {
    private final MentorPlanService mentorPlanService;

    public MentorPlanController(MentorPlanService mentorPlanService) {
        this.mentorPlanService = mentorPlanService;
    }

    @GetMapping("/api/mentors/me/plans")
    @Transactional(readOnly = true)
    public ApiResponse<List<MentorPlanResponse>> getMyPlans() {
        return ApiResponse.ok(mentorPlanService.getMyPlans());
    }

    @PutMapping("/api/mentors/me/plans")
    @Transactional
    public ApiResponse<List<MentorPlanResponse>> savePlans(@Valid @RequestBody MentorPlanSetRequest request) {
        return ApiResponse.ok("Mentorship packages saved.", mentorPlanService.savePlans(request.plans()));
    }

    @GetMapping("/api/mentors/me/one-off-sessions")
    @Transactional(readOnly = true)
    public ApiResponse<List<MentorPlanResponse>> getMyOneOffSessions() {
        return ApiResponse.ok(mentorPlanService.getMyOneOffSessions());
    }

    @PutMapping("/api/mentors/me/one-off-sessions")
    @Transactional
    public ApiResponse<List<MentorPlanResponse>> saveOneOffSessions(
            @Valid @RequestBody MentorOneOffSessionSetRequest request) {
        return ApiResponse.ok("One-off sessions saved.", mentorPlanService.saveOneOffSessions(request.sessions()));
    }

    @GetMapping("/api/mentors/{identifier}/plans")
    @Transactional(readOnly = true)
    public ApiResponse<List<MentorPlanResponse>> getMentorPlans(@PathVariable String identifier) {
        return ApiResponse.ok(mentorPlanService.getPublicPlans(identifier));
    }

    @GetMapping("/api/mentors/{identifier}/offerings")
    @Transactional(readOnly = true)
    public ApiResponse<List<MentorPlanResponse>> getMentorOfferings(@PathVariable String identifier) {
        return ApiResponse.ok(mentorPlanService.getPublicOfferings(identifier));
    }
}
