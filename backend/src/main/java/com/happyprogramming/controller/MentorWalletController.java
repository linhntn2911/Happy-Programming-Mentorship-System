package com.happyprogramming.controller;

import com.happyprogramming.dto.ApiResponse;
import com.happyprogramming.dto.MentorBankAccountRequest;
import com.happyprogramming.dto.MentorBankAccountResponse;
import com.happyprogramming.dto.MentorWalletResponse;
import com.happyprogramming.dto.PayoutOtpResponse;
import com.happyprogramming.dto.RequestPayoutOtpRequest;
import com.happyprogramming.dto.SubmitPayoutRequest;
import com.happyprogramming.service.MentorWalletService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import jakarta.servlet.http.HttpServletRequest;

@RestController
public class MentorWalletController {
    private final MentorWalletService wallet;
    public MentorWalletController(MentorWalletService wallet) { this.wallet = wallet; }

    @GetMapping("/api/mentors/me/wallet")
    public ApiResponse<MentorWalletResponse> wallet() { return ApiResponse.ok(wallet.wallet()); }

    @GetMapping("/api/mentors/me/bank-account")
    public ApiResponse<MentorBankAccountResponse> bankAccount() { return ApiResponse.ok(wallet.bankAccount()); }

    @PutMapping("/api/mentors/me/bank-account")
    public ApiResponse<MentorBankAccountResponse> saveBankAccount(@Valid @RequestBody MentorBankAccountRequest request,
                                                                  HttpServletRequest servletRequest) {
        return ApiResponse.ok("Bank account saved.", wallet.saveBankAccount(request, servletRequest.getRemoteAddr()));
    }

    @PostMapping("/api/mentors/me/payout-otp")
    public ApiResponse<PayoutOtpResponse> requestPayoutOtp(@Valid @RequestBody RequestPayoutOtpRequest request,
                                                           HttpServletRequest servletRequest) {
        return ApiResponse.ok("Verification code sent.", wallet.requestPayoutOtp(request, servletRequest.getRemoteAddr()));
    }

    @PostMapping("/api/mentors/me/payout-requests")
    public ApiResponse<MentorWalletResponse.PayoutRequest> request(@Valid @RequestBody SubmitPayoutRequest request,
                                                                    HttpServletRequest servletRequest) {
        return ApiResponse.ok("Payout request submitted for review.", wallet.submitPayoutWithOtp(request, servletRequest.getRemoteAddr()));
    }
}
