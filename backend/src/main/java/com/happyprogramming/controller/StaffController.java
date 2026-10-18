package com.happyprogramming.controller;

import com.happyprogramming.dto.AdminPayoutRequest;
import com.happyprogramming.dto.ApiResponse;
import com.happyprogramming.dto.AuthenticatedUser;
import com.happyprogramming.dto.PayoutDecisionRequest;
import com.happyprogramming.dto.SkillDtos;
import com.happyprogramming.service.MentorWalletService;
import com.happyprogramming.service.StaffAccessService;
import com.happyprogramming.service.StaffService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/staff")
public class StaffController {
    private final StaffService service;
    private final StaffAccessService access;
    private final MentorWalletService wallet;

    public StaffController(StaffService service, StaffAccessService access, MentorWalletService wallet) {
        this.service = service;
        this.access = access;
        this.wallet = wallet;
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
}
