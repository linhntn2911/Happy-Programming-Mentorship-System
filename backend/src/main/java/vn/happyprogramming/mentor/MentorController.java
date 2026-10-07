package vn.happyprogramming.mentor;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.server.ResponseStatusException;
import vn.happyprogramming.common.ApiResponse;

@RestController
@Validated
@RequestMapping("/api")
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

    @GetMapping("/mentors")
    public ApiResponse<List<MentorCard>> getFeaturedMentors() {
        return ApiResponse.ok(mentorCatalog.featuredMentors());
    }

    @GetMapping("/mentors/me/profile")
    @Transactional(readOnly = true)
    public ApiResponse<MentorProfileResponse> getMyProfile() {
        return ApiResponse.ok(mentorService.getMyProfile());
    }

    @PutMapping("/mentors/me/profile")
    @Transactional
    public ApiResponse<MentorProfileResponse> updateMyProfile(
            @Valid @RequestBody MentorProfileRequest request) {
        return ApiResponse.ok(mentorService.updateMyProfile(request));
    }

    @GetMapping("/skills")
    public ApiResponse<List<SkillTagResponse>> getActiveSkills(
            @RequestParam(defaultValue = "true") boolean active) {
        if (!active) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Only active skill tags are available.");
        }
        return ApiResponse.ok(mentorService.getActiveSkills());
    }

    @GetMapping("/mentors/me/dashboard")
    public ApiResponse<MentorDashboardResponse> getMyDashboard() {
        return ApiResponse.ok(mentorDashboardService.getMyDashboard());
    }

    @PutMapping("/mentors/me/requests/{requestId}/decision")
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
