package com.happyprogramming.controller;

import com.happyprogramming.dto.MentorBankAccountResponse;
import com.happyprogramming.dto.MentorWalletResponse;
import com.happyprogramming.dto.PayoutOtpResponse;
import com.happyprogramming.service.MentorWalletService;

import java.math.BigDecimal;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentMatchers;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(MentorWalletController.class)
@AutoConfigureMockMvc(addFilters = false)
class MentorWalletControllerTest {
    @MockitoBean
    private com.happyprogramming.service.StaffAccessService staffAccess;
    @MockitoBean
    private MentorWalletService wallet;
    @Autowired
    private MockMvc mockMvc;

    private static MentorBankAccountResponse savedAccount() {
        return new MentorBankAccountResponse(true, "TPBank", "Nguyen Van A", "6789",
                Instant.parse("2026-10-13T02:00:00Z"));
    }

    private static MentorWalletResponse.PayoutRequest payout() {
        return new MentorWalletResponse.PayoutRequest(7L, new BigDecimal("500000"), "TPBank",
                "Nguyen Van A", "6789", "REQUESTED", null, null,
                Instant.parse("2026-10-13T02:05:00Z"), null);
    }

    @Test
    void getBankAccountReturnsTheSavedDestination() throws Exception {
        when(wallet.bankAccount()).thenReturn(savedAccount());

        mockMvc.perform(get("/api/mentors/me/bank-account").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.saved").value(true))
                .andExpect(jsonPath("$.data.bankName").value("TPBank"))
                .andExpect(jsonPath("$.data.accountLast4").value("6789"));
    }

    @Test
    void saveBankAccountPersistsTheDestination() throws Exception {
        when(wallet.saveBankAccount(ArgumentMatchers.any(), ArgumentMatchers.any())).thenReturn(savedAccount());

        mockMvc.perform(put("/api/mentors/me/bank-account")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"bankName\":\"TPBank\",\"accountName\":\"Nguyen Van A\",\"accountNumber\":\"123456789\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Bank account saved."))
                .andExpect(jsonPath("$.data.accountLast4").value("6789"));
    }

    @Test
    void saveBankAccountRejectsAnInvalidAccountNumber() throws Exception {
        mockMvc.perform(put("/api/mentors/me/bank-account")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"bankName\":\"TPBank\",\"accountName\":\"Nguyen Van A\",\"accountNumber\":\"abc\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void requestPayoutOtpSendsACode() throws Exception {
        when(wallet.requestPayoutOtp(ArgumentMatchers.any(), ArgumentMatchers.any()))
                .thenReturn(new PayoutOtpResponse("ng•••@example.com", "TPBank ···· 6789", 600));

        mockMvc.perform(post("/api/mentors/me/payout-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"amount\":500000}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Verification code sent."))
                .andExpect(jsonPath("$.data.maskedEmail").value("ng•••@example.com"))
                .andExpect(jsonPath("$.data.expiresInSeconds").value(600));
    }

    @Test
    void submitPayoutDelegatesToTheOtpGatedService() throws Exception {
        when(wallet.submitPayoutWithOtp(ArgumentMatchers.any(), ArgumentMatchers.any())).thenReturn(payout());

        mockMvc.perform(post("/api/mentors/me/payout-requests")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"amount\":500000,\"otp\":\"123456\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Payout request submitted for review."))
                .andExpect(jsonPath("$.data.status").value("REQUESTED"));
    }

    @Test
    void submitPayoutRejectsAMalformedOtp() throws Exception {
        mockMvc.perform(post("/api/mentors/me/payout-requests")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"amount\":500000,\"otp\":\"12\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void insufficientBalanceConflictIsPropagated() throws Exception {
        when(wallet.submitPayoutWithOtp(ArgumentMatchers.any(), ArgumentMatchers.any()))
                .thenThrow(new ResponseStatusException(HttpStatus.CONFLICT, "Payout amount exceeds your available balance."));

        mockMvc.perform(post("/api/mentors/me/payout-requests")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"amount\":5000000,\"otp\":\"123456\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Payout amount exceeds your available balance."));
    }
}
