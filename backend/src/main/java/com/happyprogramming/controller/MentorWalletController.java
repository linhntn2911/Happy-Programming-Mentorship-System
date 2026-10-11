package com.happyprogramming.controller;

import com.happyprogramming.dto.ApiResponse;
import com.happyprogramming.dto.CreatePayoutRequest;
import com.happyprogramming.dto.MentorWalletResponse;
import com.happyprogramming.service.MentorWalletService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import jakarta.servlet.http.HttpServletRequest;

@RestController
public class MentorWalletController {
    private final MentorWalletService wallet;
    public MentorWalletController(MentorWalletService wallet) { this.wallet = wallet; }

    @GetMapping("/api/mentors/me/wallet")
    public ApiResponse<MentorWalletResponse> wallet() { return ApiResponse.ok(wallet.wallet()); }

    @PostMapping("/api/mentors/me/payout-requests")
    public ApiResponse<MentorWalletResponse.PayoutRequest> request(@Valid @RequestBody CreatePayoutRequest request,
                                                                    HttpServletRequest servletRequest) {
        return ApiResponse.ok("Payout request submitted for review.", wallet.requestPayout(request, servletRequest.getRemoteAddr()));
    }
}
