package com.happyprogramming.controller;

import com.happyprogramming.dto.AdminDtos;
import com.happyprogramming.dto.ApiResponse;
import com.happyprogramming.dto.AuthenticatedUser;
import com.happyprogramming.repository.AdminRepository;
import com.happyprogramming.service.AdminService;



import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import static com.happyprogramming.dto.AdminDtos.*;

@RestController
@RequestMapping("/api/admin")
public class AdminController {
    private String email(Authentication auth) {
        if (auth.getPrincipal() instanceof com.happyprogramming.dto.AuthenticatedUser user) return user.email();
        throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.UNAUTHORIZED);
    }
    private final AdminService service;
    public AdminController(AdminService service) { this.service = service; }
    @GetMapping("/csrf") public ApiResponse<?> csrf(CsrfToken token) { return ApiResponse.ok(Map.of("token", token.getToken(), "headerName", token.getHeaderName())); }
    @GetMapping("/session") public ApiResponse<Session> session(Authentication auth) { return ApiResponse.ok(service.requireAdmin(email(auth))); }
    @GetMapping("/workspace") public ApiResponse<Workspace> workspace(Authentication auth) { service.requireAdmin(email(auth)); return ApiResponse.ok(service.workspace()); }
    @PatchMapping("/users/{id}/status") public ApiResponse<Boolean> status(@PathVariable long id, @Valid @RequestBody StatusChange change, Authentication auth, HttpServletRequest request) {
        service.status(id, change, service.requireAdmin(email(auth)), request.getRemoteAddr()); return ApiResponse.ok(true);
    }
    @PutMapping("/users/{id}/permissions") public ApiResponse<Boolean> permissions(@PathVariable long id, @Valid @RequestBody PermissionChange change, Authentication auth, HttpServletRequest request) {
        service.permissions(id, change, service.requireAdmin(email(auth)), request.getRemoteAddr()); return ApiResponse.ok(true);
    }
    @PutMapping("/settings") public ApiResponse<Boolean> settings(@Valid @RequestBody SettingsChange change, Authentication auth, HttpServletRequest request) {
        service.settings(change, service.requireAdmin(email(auth)), request.getRemoteAddr()); return ApiResponse.ok(true);
    }
}
