package com.happyprogramming.controller;

import com.happyprogramming.dto.AdminPayoutRequest;
import com.happyprogramming.dto.AuthenticatedUser;
import com.happyprogramming.dto.DisputeFileDownload;
import com.happyprogramming.dto.PayoutDecisionRequest;
import com.happyprogramming.service.DisputeService;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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

    @MockitoBean
    private DisputeService disputeService;

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

    @Test
    void shouldReturnReportsForStaff() throws Exception {
        var summary = new com.happyprogramming.dto.StaffDisputeDtos.StaffSummary(
                1L, "HP-DSP-202610-0001", "ONE_OFF", 5L, "Java Mentoring",
                "Mentee John", "mentee@test.com", "Mentor Jane", "mentor@test.com",
                Instant.now(), new BigDecimal("500000"), "VND", "NO_SHOW", "SUBMITTED",
                Instant.now(), null, null
        );
        when(disputeService.staffListDisputes()).thenReturn(List.of(summary));

        mockMvc.perform(get("/api/staff/reports")
                        .with(authentication(staffPrincipal()))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].id").value(1))
                .andExpect(jsonPath("$.data[0].ticketCode").value("HP-DSP-202610-0001"))
                .andExpect(jsonPath("$.data[0].complainantName").value("Mentee John"))
                .andExpect(jsonPath("$.data[0].disputedAmount").value(500000));
    }

    @Test
    void shouldReturnReportDetailForStaff() throws Exception {
        var detail = new com.happyprogramming.dto.StaffDisputeDtos.StaffDetail(
                1L, "HP-DSP-202610-0001", "ONE_OFF", 5L, "Java Mentoring",
                10L, "Mentee John", "mentee@test.com", 20L, "Mentor Jane", "mentor@test.com",
                Instant.now(), new BigDecimal("500000"), "VND", "NO_SHOW",
                "Mentor failed to show up for the session after waiting 20 minutes.",
                "SUBMITTED", Instant.now(), Instant.now(), null, null, null,
                null, null, null, null, List.of()
        );
        when(disputeService.staffDisputeDetail(1L)).thenReturn(detail);

        mockMvc.perform(get("/api/staff/reports/1")
                        .with(authentication(staffPrincipal()))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.ticketCode").value("HP-DSP-202610-0001"))
                .andExpect(jsonPath("$.data.description").value("Mentor failed to show up for the session after waiting 20 minutes."));
    }

    @Test
    void shouldIntakeReportForStaff() throws Exception {
        var detail = new com.happyprogramming.dto.StaffDisputeDtos.StaffDetail(
                1L, "HP-DSP-202610-0001", "ONE_OFF", 5L, "Java Mentoring",
                10L, "Mentee John", "mentee@test.com", 20L, "Mentor Jane", "mentor@test.com",
                Instant.now(), new BigDecimal("500000"), "VND", "NO_SHOW",
                "Mentor failed to show up for the session after waiting 20 minutes.",
                "IN_MEDIATION", Instant.now(), Instant.now(), 99L, "Operational Staff",
                Instant.now().plusSeconds(86400), null, null, null, null, List.of()
        );
        when(disputeService.staffIntake(eq(1L), any())).thenReturn(detail);

        mockMvc.perform(post("/api/staff/reports/1/intake")
                        .with(authentication(staffPrincipal()))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("IN_MEDIATION"))
                .andExpect(jsonPath("$.data.assignedStaffName").value("Operational Staff"));
    }

    @Test
    void shouldResolveReportForStaff() throws Exception {
        var detail = new com.happyprogramming.dto.StaffDisputeDtos.StaffDetail(
                1L, "HP-DSP-202610-0001", "ONE_OFF", 5L, "Java Mentoring",
                10L, "Mentee John", "mentee@test.com", 20L, "Mentor Jane", "mentor@test.com",
                Instant.now(), new BigDecimal("500000"), "VND", "NO_SHOW",
                "Mentor failed to show up for the session after waiting 20 minutes.",
                "RESOLVED", Instant.now(), Instant.now(), 99L, "Operational Staff",
                null, "FULL_REFUND", "Mentor no-show verified from timestamps and chat proof.",
                new BigDecimal("500000"), Instant.now(), List.of()
        );
        when(disputeService.staffResolve(eq(1L), any(), any(), any())).thenReturn(detail);

        mockMvc.perform(post("/api/staff/reports/1/resolve")
                        .with(authentication(staffPrincipal()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "resolutionType": "FULL_REFUND",
                                  "resolutionNote": "Mentor no-show verified from timestamps and chat proof."
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("RESOLVED"))
                .andExpect(jsonPath("$.data.resolutionType").value("FULL_REFUND"));
    }

    @Test
    void shouldDownloadEvidenceFileForStaff() throws Exception {
        var file = new DisputeFileDownload("chat-proof.png", "image/png", 4L, new byte[]{1, 2, 3, 4});
        when(disputeService.staffDownloadEvidence(1L, 10L)).thenReturn(file);

        mockMvc.perform(get("/api/staff/reports/1/evidence/10")
                        .with(authentication(staffPrincipal())))
                .andExpect(status().isOk())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.header().string("Content-Type", "image/png"))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.content().bytes(new byte[]{1, 2, 3, 4}));
    }

    @Test
    void shouldSupportDisputesPathAlias() throws Exception {
        when(disputeService.staffListDisputes()).thenReturn(List.of());

        mockMvc.perform(get("/api/staff/disputes")
                        .with(authentication(staffPrincipal()))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void shouldRejectResolutionWhenResolutionTypeMissing() throws Exception {
        mockMvc.perform(post("/api/staff/reports/1/resolve")
                        .with(authentication(staffPrincipal()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "resolutionType": "",
                                  "resolutionNote": "Short"
                                }
                                """))
                .andExpect(status().isBadRequest());
    }
}
