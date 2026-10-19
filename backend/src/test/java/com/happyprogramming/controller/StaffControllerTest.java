package com.happyprogramming.controller;

import com.happyprogramming.dto.AdminPayoutRequest;
import com.happyprogramming.dto.AuthenticatedUser;
import com.happyprogramming.dto.PayoutDecisionRequest;
import com.happyprogramming.service.MentorWalletService;
import com.happyprogramming.service.StaffAccessService;
import com.happyprogramming.service.StaffService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(StaffController.class)
@AutoConfigureMockMvc(addFilters = false)
class StaffControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private StaffService service;

    @MockitoBean
    private StaffAccessService access;

    @MockitoBean
    private MentorWalletService wallet;

    private UsernamePasswordAuthenticationToken staffPrincipal() {
        AuthenticatedUser user = new AuthenticatedUser(99L, "Operational Staff", "staff@example.com", "STAFF");
        return new UsernamePasswordAuthenticationToken(user, null, List.of(() -> "ROLE_STAFF"));
    }

    @Test
    void shouldReturnSkillsAndCategoriesForStaff() throws Exception {
        when(access.permissions(any())).thenReturn(java.util.Set.of("SKILL_MANAGE"));
        when(service.getSkills()).thenReturn(List.of());
        when(service.getSkillCategories()).thenReturn(List.of());

        mockMvc.perform(get("/api/staff/skills").with(authentication(staffPrincipal())).accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray());

        mockMvc.perform(get("/api/staff/skill-categories").with(authentication(staffPrincipal())).accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray());
    }

    @Test
    void shouldReturnPayoutRequestsForStaff() throws Exception {
        AdminPayoutRequest sample = new AdminPayoutRequest(1L, 10L, "Mentor A", "mentor@test.com",
                new BigDecimal("1500000"), "TPBank", "Nguyen Van A", "1234567890", "REQUESTED", Instant.now());
        when(wallet.pendingPayouts()).thenReturn(List.of(sample));

        mockMvc.perform(get("/api/staff/payout-requests").with(authentication(staffPrincipal())).accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].id").value(1))
                .andExpect(jsonPath("$.data[0].amount").value(1500000))
                .andExpect(jsonPath("$.data[0].bankName").value("TPBank"))
                .andExpect(jsonPath("$.data[0].accountNumber").value("1234567890"));
    }

    @Test
    void shouldDecidePayoutPaidForStaff() throws Exception {
        mockMvc.perform(patch("/api/staff/payout-requests/1")
                        .with(authentication(staffPrincipal()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"decision":"PAID","transferReference":"FT26101900123"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").value(true));

        verify(wallet).decidePayout(eq(1L), any(PayoutDecisionRequest.class), any());
    }

    @Test
    void shouldDecidePayoutRejectedForStaff() throws Exception {
        mockMvc.perform(patch("/api/staff/payout-requests/1")
                        .with(authentication(staffPrincipal()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"decision":"REJECTED","rejectionReason":"Invalid account holder name"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").value(true));

        verify(wallet).decidePayout(eq(1L), any(PayoutDecisionRequest.class), any());
    }
}
