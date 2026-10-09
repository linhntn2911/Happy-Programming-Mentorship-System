package com.happyprogramming.role.staff;

import com.happyprogramming.role.auth.AuthenticatedUser;
import com.happyprogramming.role.shared.ApiResponse;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/staff")
public class StaffController {
    private final StaffService service;
    private final StaffAccessService access;
    public StaffController(StaffService service, StaffAccessService access) { this.service = service; this.access = access; }
    @GetMapping("/access") public ApiResponse<?> access(@AuthenticationPrincipal AuthenticatedUser user) { return ApiResponse.ok(java.util.Map.of("user", user, "permissions", access.permissions(user))); }
    @GetMapping("/dashboard") public ApiResponse<?> dashboard(@AuthenticationPrincipal AuthenticatedUser user) { return ApiResponse.ok(service.getDashboardOverview(user)); }
    @GetMapping("/mentors") public ApiResponse<?> mentors() { return ApiResponse.ok(service.getMentors()); }
    @GetMapping("/mentees") public ApiResponse<?> mentees() { return ApiResponse.ok(service.getMentees()); }
    @GetMapping("/skills") public ApiResponse<?> skills() { return ApiResponse.ok(service.getSkills()); }
    @GetMapping("/requests") public ApiResponse<?> requests() { return ApiResponse.ok(service.getRequests()); }
}
