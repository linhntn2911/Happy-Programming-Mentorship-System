package com.happyprogramming.role.mentor;

import com.happyprogramming.role.mentor.MentorDashboardResponse;
import com.happyprogramming.role.mentor.MentorDashboardSummary;
import com.happyprogramming.role.mentor.MentorRequestDecisionRequest;
import com.happyprogramming.role.mentor.MentorRequestDecisionResponse;
import com.happyprogramming.role.mentor.MentorDashboardService;
import com.happyprogramming.role.mentor.MentorService;

import com.happyprogramming.role.mentor.MentorCatalog;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

@WebMvcTest(MentorController.class)
@AutoConfigureMockMvc(addFilters = false)
class MentorDashboardControllerTest {
    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private MentorCatalog mentorCatalog;
    @MockitoBean
    private MentorService mentorService;
    @MockitoBean
    private MentorDashboardService mentorDashboardService;

    @Test
    void dashboardReturnsTheStandardEnvelopeAndAllSections() throws Exception {
        when(mentorDashboardService.getMyDashboard()).thenReturn(new MentorDashboardResponse(
                new MentorDashboardSummary(
                        new BigDecimal("42000.00"), "VND", 0L, null, 0L),
                List.of(),
                List.of()));

        mockMvc.perform(get("/api/mentors/me/dashboard"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.summary.netEarnings").value(42000.00))
                .andExpect(jsonPath("$.data.summary.pendingInvitations").value(0))
                .andExpect(jsonPath("$.data.summary.averageRating").doesNotExist())
                .andExpect(jsonPath("$.data.incomingRequests").isArray())
                .andExpect(jsonPath("$.data.systemNotices").isArray());
    }

    @Test
    void requestDecisionAcceptsOnlyValidatedDecisionValues() throws Exception {
        when(mentorDashboardService.decideOnRequest(
                org.mockito.ArgumentMatchers.eq(52L), any(MentorRequestDecisionRequest.class)))
                .thenReturn(new MentorRequestDecisionResponse(
                        52L, "ACCEPTED", java.time.Instant.parse("2026-10-07T09:30:00Z")));

        mockMvc.perform(put("/api/mentors/me/requests/52/decision")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decision\":\"ACCEPTED\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.requestId").value(52))
                .andExpect(jsonPath("$.data.status").value("ACCEPTED"));

        mockMvc.perform(put("/api/mentors/me/requests/52/decision")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decision\":\"PENDING\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void decisionConflictDoesNotExposeOwnership() throws Exception {
        when(mentorDashboardService.decideOnRequest(
                org.mockito.ArgumentMatchers.eq(52L), any(MentorRequestDecisionRequest.class)))
                .thenThrow(new ResponseStatusException(
                        org.springframework.http.HttpStatus.CONFLICT,
                        "Request is no longer available for a decision."));

        mockMvc.perform(put("/api/mentors/me/requests/52/decision")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decision\":\"REJECTED\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Request is no longer available for a decision."));
    }

    @Test
    void dashboardDataAccessFailureReturnsGenericRetryableServiceError() throws Exception {
        when(mentorDashboardService.getMyDashboard())
                .thenThrow(new org.springframework.dao.DataAccessResourceFailureException("private database detail"));

        mockMvc.perform(get("/api/mentors/me/dashboard"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Mentor data is temporarily unavailable. Please try again."));
    }

    @Test
    void requestDecisionRejectsNonPositivePathIdentifier() throws Exception {
        mockMvc.perform(put("/api/mentors/me/requests/0/decision")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decision\":\"ACCEPTED\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Request validation failed."));
    }
}
