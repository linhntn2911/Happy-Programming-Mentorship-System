package com.happyprogramming.controller;

import com.happyprogramming.dto.AdminPayoutRequest;
import com.happyprogramming.dto.ApiResponse;
import com.happyprogramming.dto.AuthenticatedUser;
import com.happyprogramming.dto.PayoutDecisionRequest;
import com.happyprogramming.dto.SkillDtos;
import com.happyprogramming.dto.StaffDisputeDtos;
import com.happyprogramming.service.DisputeService;
import com.happyprogramming.service.MentorWalletService;
import com.happyprogramming.service.StaffAccessService;
import com.happyprogramming.service.StaffService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.nio.charset.StandardCharsets;
import java.util.List;

@RestController
@RequestMapping("/api/staff")
public class StaffController {
    private final StaffService service;
    private final StaffAccessService access;
    private final MentorWalletService wallet;
    private final DisputeService disputeService;

    public StaffController(StaffService service, StaffAccessService access,
                           MentorWalletService wallet, DisputeService disputeService) {
        this.service = service;
        this.access = access;
        this.wallet = wallet;
        this.disputeService = disputeService;
    }
    @GetMapping("/access") public ApiResponse<?> access(@AuthenticationPrincipal AuthenticatedUser user) { return ApiResponse.ok(java.util.Map.of("user", user, "permissions", access.permissions(user))); }
    @GetMapping("/dashboard") public ApiResponse<?> dashboard(@AuthenticationPrincipal AuthenticatedUser user) { return ApiResponse.ok(service.getDashboardOverview(user)); }
    @GetMapping("/mentors") public ApiResponse<?> mentors() { return ApiResponse.ok(service.getMentors()); }
    @GetMapping("/mentees") public ApiResponse<?> mentees() { return ApiResponse.ok(service.getMentees()); }
    @GetMapping("/skills") public ApiResponse<?> skills() { return ApiResponse.ok(service.getSkills()); }
    @GetMapping("/skill-categories") public ApiResponse<?> skillCategories() { return ApiResponse.ok(service.getSkillCategories()); }
    @GetMapping("/requests") public ApiResponse<?> requests() { return ApiResponse.ok(service.getRequests()); }

    @PostMapping("/skills")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<?> createSkill(@Valid @RequestBody SkillDtos.CreateSkillRequest body,
                                     @AuthenticationPrincipal AuthenticatedUser user) {
        return ApiResponse.ok("Technical skill created successfully", service.createSkill(body, user));
    }

    @PutMapping("/skills/{id}")
    public ApiResponse<?> updateSkill(@PathVariable Long id,
                                     @Valid @RequestBody SkillDtos.UpdateSkillRequest body,
                                     @AuthenticationPrincipal AuthenticatedUser user) {
        return ApiResponse.ok("Technical skill updated successfully", service.updateSkill(id, body, user));
    }

    @PatchMapping("/skills/{id}/status")
    public ApiResponse<?> toggleSkillStatus(@PathVariable Long id,
                                           @RequestBody(required = false) SkillDtos.ToggleSkillStatusRequest body,
                                           @AuthenticationPrincipal AuthenticatedUser user) {
        Boolean active = body != null ? body.active() : null;
        return ApiResponse.ok("Skill status updated successfully", service.toggleSkillStatus(id, active, user));
    }

    @GetMapping("/payout-requests")
    public ApiResponse<List<AdminPayoutRequest>> payoutRequests() {
        return ApiResponse.ok(wallet.pendingPayouts());
    }

    @PatchMapping("/payout-requests/{id}")
    public ApiResponse<Boolean> decidePayout(@PathVariable long id,
            @Valid @RequestBody PayoutDecisionRequest decision, HttpServletRequest request) {
        wallet.decidePayout(id, decision, request.getRemoteAddr());
        return ApiResponse.ok(true);
    }

    @GetMapping({"/reports", "/disputes"})
    public ApiResponse<List<StaffDisputeDtos.StaffSummary>> reports() {
        return ApiResponse.ok(disputeService.staffListDisputes());
    }

    @GetMapping({"/reports/{id}", "/disputes/{id}"})
    public ApiResponse<StaffDisputeDtos.StaffDetail> reportDetail(@PathVariable long id) {
        return ApiResponse.ok(disputeService.staffDisputeDetail(id));
    }

    @GetMapping({"/reports/{id}/evidence/{evidenceId}", "/disputes/{id}/evidence/{evidenceId}"})
    public ResponseEntity<byte[]> reportEvidence(@PathVariable long id, @PathVariable long evidenceId) {
        var file = disputeService.staffDownloadEvidence(id, evidenceId);
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .header("X-Content-Type-Options", "nosniff")
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.inline().filename(file.fileName(), StandardCharsets.UTF_8).build().toString())
                .contentType(MediaType.parseMediaType(file.mimeType()))
                .contentLength(file.sizeBytes())
                .body(file.content());
    }

    @PostMapping({"/reports/{id}/intake", "/disputes/{id}/intake"})
    public ApiResponse<StaffDisputeDtos.StaffDetail> intakeReport(
            @PathVariable long id,
            @AuthenticationPrincipal AuthenticatedUser user) {
        return ApiResponse.ok("Dispute mediation intake completed.", disputeService.staffIntake(id, user));
    }

    @PostMapping({"/reports/{id}/resolve", "/disputes/{id}/resolve"})
    public ApiResponse<StaffDisputeDtos.StaffDetail> resolveReport(
            @PathVariable long id,
            @Valid @RequestBody StaffDisputeDtos.ResolveRequest body,
            @AuthenticationPrincipal AuthenticatedUser user,
            HttpServletRequest request) {
        return ApiResponse.ok("Dispute resolution finalized.", disputeService.staffResolve(id, body, user, request.getRemoteAddr()));
    }
}
