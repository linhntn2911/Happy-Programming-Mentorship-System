package com.happyprogramming.controller;

import com.happyprogramming.dto.AdminDtos;
import com.happyprogramming.dto.ApiResponse;
import com.happyprogramming.dto.AuthenticatedUser;
import com.happyprogramming.dto.AdminPayoutRequest;
import com.happyprogramming.dto.AdminRefundRequest;
import com.happyprogramming.dto.PayoutDecisionRequest;
import com.happyprogramming.dto.RefundDecisionRequest;
import com.happyprogramming.repository.AdminRepository;
import com.happyprogramming.service.AdminService;
import com.happyprogramming.service.DisputeService;
import com.happyprogramming.service.MentorWalletService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.List;
import static com.happyprogramming.dto.AdminDtos.*;

@RestController
@RequestMapping("/api/admin")
public class AdminController {
    private String email(Authentication auth) {
        if (auth.getPrincipal() instanceof AuthenticatedUser user) return user.email();
        throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.UNAUTHORIZED);
    }
    private AuthenticatedUser user(Authentication auth) {
        if (auth.getPrincipal() instanceof AuthenticatedUser user) return user;
        throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.UNAUTHORIZED);
    }

    private final AdminService service;
    private final MentorWalletService wallet;
    private final DisputeService disputeService;

    public AdminController(AdminService service) {
        this.service = service;
        this.wallet = null;
        this.disputeService = null;
    }

    @org.springframework.beans.factory.annotation.Autowired
    public AdminController(AdminService service, MentorWalletService wallet, DisputeService disputeService) {
        this.service = service;
        this.wallet = wallet;
        this.disputeService = disputeService;
    }

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

    @GetMapping("/payout-history") public ApiResponse<List<com.happyprogramming.dto.AdminPayoutHistory>> payoutHistory(Authentication auth) {
        return ApiResponse.ok(service.payoutHistory(email(auth)));
    }
    @GetMapping("/payout-requests") public ApiResponse<List<AdminPayoutRequest>> payoutRequests(Authentication auth) {
        service.requireAdmin(email(auth)); return ApiResponse.ok(wallet.adminPendingPayouts());
    }
    @PatchMapping("/payout-requests/{id}") public ApiResponse<Boolean> decidePayout(@PathVariable long id,
            @Valid @RequestBody PayoutDecisionRequest decision, Authentication auth, HttpServletRequest request) {
        service.requireAdmin(email(auth)); wallet.decidePayout(id, decision, request.getRemoteAddr()); return ApiResponse.ok(true);
    }

    @GetMapping("/refund-history")
    public ApiResponse<List<AdminRefundRequest>> refundHistory(Authentication auth) {
        service.requireAdmin(email(auth));
        return ApiResponse.ok(disputeService.adminRefundHistory());
    }
    @GetMapping("/refund-requests")
    public ApiResponse<List<AdminRefundRequest>> refundRequests(Authentication auth) {
        service.requireAdmin(email(auth));
        return ApiResponse.ok(disputeService.adminPendingRefunds());
    }
    @PatchMapping("/refund-requests/{id}")
    public ApiResponse<Boolean> decideRefund(@PathVariable long id,
            @Valid @RequestBody RefundDecisionRequest decision, Authentication auth, HttpServletRequest request) {
        service.requireAdmin(email(auth));
        disputeService.adminDecideRefund(id, decision, user(auth), request.getRemoteAddr());
        return ApiResponse.ok(true);
    }
}
