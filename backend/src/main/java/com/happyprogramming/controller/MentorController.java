package com.happyprogramming.controller;

import com.happyprogramming.dto.ApiResponse;
import com.happyprogramming.dto.MentorCard;
import com.happyprogramming.dto.MentorDashboardResponse;
import com.happyprogramming.dto.MentorProfileRequest;
import com.happyprogramming.dto.MentorProfileResponse;
import com.happyprogramming.dto.MentorRequestDecisionRequest;
import com.happyprogramming.dto.MentorRequestDecisionResponse;
import com.happyprogramming.dto.SkillTagResponse;
import com.happyprogramming.service.MentorCatalog;
import com.happyprogramming.service.MentorDashboardService;
import com.happyprogramming.service.MentorService;

import java.util.List;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.server.ResponseStatusException;

@RestController
@Validated
@CrossOrigin(origins = "*")
public class MentorController {
    private final MentorCatalog mentorCatalog;
    private final MentorService mentorService;
    private final MentorDashboardService mentorDashboardService;

    public MentorController(
            MentorCatalog mentorCatalog,
            MentorService mentorService,
            MentorDashboardService mentorDashboardService) {
        this.mentorCatalog = mentorCatalog;
        this.mentorService = mentorService;
        this.mentorDashboardService = mentorDashboardService;
    }

    @GetMapping("/api/mentors")
    public ApiResponse<List<MentorCard>> searchMentors(
            @RequestParam(defaultValue = "") String q,
            @RequestParam(required = false) List<String> skills,
            @RequestParam(required = false) List<String> jobTitles,
            @RequestParam(required = false) List<String> companies,
            @RequestParam(required = false) List<String> languages,
            @RequestParam(required = false) List<String> countries,
            @RequestParam(required = false) Integer minExperience,
            @RequestParam(required = false) Long minPrice,
            @RequestParam(required = false) Long maxPrice,
            @RequestParam(required = false) Double minRating,
            @RequestParam(required = false) Boolean available,
            @RequestParam(defaultValue = "recommended") String sort) {
        return ApiResponse.ok(mentorCatalog.search(q, skills, jobTitles, companies, languages, countries,
                minExperience, minPrice, maxPrice, minRating, available, sort));
    }

    @GetMapping("/api/mentors/me/profile")
    @Transactional(readOnly = true)
    public ApiResponse<MentorProfileResponse> getMyProfile() {
        return ApiResponse.ok(mentorService.getMyProfile());
    }

    @GetMapping("/api/mentors/{slug}/avatar")
    public org.springframework.http.ResponseEntity<byte[]> avatar(@PathVariable String slug) {
        return org.springframework.http.ResponseEntity.ok().cacheControl(org.springframework.http.CacheControl.noStore())
            .header("X-Content-Type-Options", "nosniff").contentType(org.springframework.http.MediaType.IMAGE_PNG).body(mentorCatalog.avatar(slug));
    }

    @PutMapping("/api/mentors/me/profile")
    @Transactional
    public ApiResponse<MentorProfileResponse> updateMyProfile(
            @Valid @RequestBody MentorProfileRequest request) {
        return ApiResponse.ok(mentorService.updateMyProfile(request));
    }

    @GetMapping("/api/skills")
    public ApiResponse<List<SkillTagResponse>> getActiveSkills(
            @RequestParam(defaultValue = "true") boolean active) {
        if (!active) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Only active skill tags are available.");
        }
        return ApiResponse.ok(mentorService.getActiveSkills());
    }

    @GetMapping("/api/mentors/me/dashboard")
    public ApiResponse<MentorDashboardResponse> getMyDashboard() {
        return ApiResponse.ok(mentorDashboardService.getMyDashboard());
    }

    @PutMapping("/api/mentors/me/requests/{requestId}/decision")
    public ApiResponse<MentorRequestDecisionResponse> decideOnRequest(
            @PathVariable @Positive long requestId,
            @Valid @RequestBody MentorRequestDecisionRequest request) {
        MentorRequestDecisionResponse response =
                mentorDashboardService.decideOnRequest(requestId, request);
        String message = "ACCEPTED".equals(response.status())
                ? "Mentorship request accepted."
                : "Mentorship request rejected.";
        return ApiResponse.ok(message, response);
    }
}
