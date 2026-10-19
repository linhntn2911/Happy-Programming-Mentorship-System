package com.happyprogramming.controller;

import com.happyprogramming.dto.MentorPlanResponse;
import com.happyprogramming.service.MentorPlanService;


import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentMatchers;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(MentorPlanController.class)
@AutoConfigureMockMvc(addFilters = false)
class MentorPlanControllerTest {
    @MockitoBean
    private com.happyprogramming.service.StaffAccessService staffAccess;
    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private MentorPlanService mentorPlanService;

    private static MentorPlanResponse samplePlan() {
        return new MentorPlanResponse(
                11L, "Standard Mentorship", "MONTHLY", "STANDARD", "Four calls a month plus chat.",
                new BigDecimal("2500000.00"), "VND", 60, 4, 7, 24, true, "ACTIVE");
    }

    @Test
    void getMyPlansReturnsTheStandardEnvelope() throws Exception {
        when(mentorPlanService.getMyPlans()).thenReturn(List.of(samplePlan()));

        mockMvc.perform(get("/api/mentors/me/plans").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[0].name").value("Standard Mentorship"))
                .andExpect(jsonPath("$.data[0].planTier").value("STANDARD"))
                .andExpect(jsonPath("$.data[0].price").value(2500000.00))
                .andExpect(jsonPath("$.data[0].serviceType").value("MONTHLY"));
    }

    @Test
    void getMentorPlansReturnsOnlyActivePublicPackages() throws Exception {
        when(mentorPlanService.getPublicPlans("11")).thenReturn(List.of(samplePlan()));

        mockMvc.perform(get("/api/mentors/11/plans").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].planTier").value("STANDARD"));
    }

    @Test
    void getMentorOfferingsReturnsActivePublicOfferings() throws Exception {
        when(mentorPlanService.getPublicOfferings("11")).thenReturn(List.of(samplePlan()));

        mockMvc.perform(get("/api/mentors/11/offerings").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].id").value(11));
    }

    @Test
    void savePlansPersistsTheTierSet() throws Exception {
        when(mentorPlanService.savePlans(ArgumentMatchers.anyList()))
                .thenReturn(List.of(samplePlan()));

        mockMvc.perform(put("/api/mentors/me/plans")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"plans":[{"planTier":"STANDARD","price":2500000,"sessionDurationMinutes":60,
                                 "callsPerPeriod":4,"description":"Four calls a month plus chat.","status":"ACTIVE"}]}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Mentorship packages saved."))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[0].planTier").value("STANDARD"))
                .andExpect(jsonPath("$.data[0].callsPerPeriod").value(4));
    }

    @Test
    void savePlansRejectsInvalidTierPayload() throws Exception {
        mockMvc.perform(put("/api/mentors/me/plans")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"plans":[{"planTier":"ULTRA","price":-5,"sessionDurationMinutes":0,
                                 "callsPerPeriod":-1,"description":""}]}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void getMyOneOffSessionsReturnsTheMentorOwnedOptions() throws Exception {
        when(mentorPlanService.getMyOneOffSessions()).thenReturn(List.of(
                new MentorPlanResponse(12L, "Work review", "ONE_OFF", null,
                        "Review a pull request together.", new BigDecimal("99000.00"),
                        "VND", 30, null, 0, 24, true, "ACTIVE")));

        mockMvc.perform(get("/api/mentors/me/one-off-sessions").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].name").value("Work review"))
                .andExpect(jsonPath("$.data[0].serviceType").value("ONE_OFF"))
                .andExpect(jsonPath("$.data[0].sessionDurationMinutes").value(30));
    }

    @Test
    void saveOneOffSessionsAcceptsSessionOptions() throws Exception {
        when(mentorPlanService.saveOneOffSessions(ArgumentMatchers.anyList())).thenReturn(List.of(
                new MentorPlanResponse(12L, "Work review", "ONE_OFF", null,
                        "Review a pull request together.", new BigDecimal("99000.00"),
                        "VND", 30, null, 0, 24, true, "ACTIVE")));

        mockMvc.perform(put("/api/mentors/me/one-off-sessions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"sessions":[{"name":"Work review","description":"Review a pull request together.",
                                 "price":99000,"sessionDurationMinutes":30,"status":"ACTIVE"}]}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("One-off sessions saved."))
                .andExpect(jsonPath("$.data[0].serviceType").value("ONE_OFF"));
    }

    @Test
    void storageFailureReturnsGenericRetryableServiceError() throws Exception {
        when(mentorPlanService.getMyPlans())
                .thenThrow(new DataAccessResourceFailureException("private database detail"));

        mockMvc.perform(get("/api/mentors/me/plans"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Mentor data is temporarily unavailable. Please try again."));
    }

    @Test
    void inactiveMentorConflictIsPropagated() throws Exception {
        when(mentorPlanService.getMyPlans())
                .thenThrow(new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                        "Mentor package storage is not available."));

        mockMvc.perform(get("/api/mentors/me/plans"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Mentor package storage is not available."));
    }
}
