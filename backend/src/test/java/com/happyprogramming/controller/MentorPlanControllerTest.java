package com.happyprogramming.controller;

import com.happyprogramming.dto.MentorPlanRequest;
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
    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private MentorPlanService mentorPlanService;

    private static MentorPlanResponse samplePlan() {
        return new MentorPlanResponse(
                11L, "Monthly Mentorship", "MONTHLY", "Four calls a month plus chat.",
                new BigDecimal("2500000.00"), "VND", 60, 4, 7, 24, true, "ACTIVE");
    }

    @Test
    void getMyPlansReturnsTheStandardEnvelope() throws Exception {
        when(mentorPlanService.getMyPlans()).thenReturn(List.of(samplePlan()));

        mockMvc.perform(get("/api/mentors/me/plans").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[0].name").value("Monthly Mentorship"))
                .andExpect(jsonPath("$.data[0].price").value(2500000.00))
                .andExpect(jsonPath("$.data[0].serviceType").value("MONTHLY"));
    }

    @Test
    void saveMonthlyPlanReturnsSavedPackage() throws Exception {
        when(mentorPlanService.saveMonthlyPlan(ArgumentMatchers.any(MentorPlanRequest.class)))
                .thenReturn(samplePlan());

        mockMvc.perform(put("/api/mentors/me/plans")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Monthly Mentorship","price":2500000,"sessionDurationMinutes":60,
                                 "callsPerPeriod":4,"description":"Four calls a month plus chat."}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Mentorship package saved."))
                .andExpect(jsonPath("$.data.name").value("Monthly Mentorship"))
                .andExpect(jsonPath("$.data.callsPerPeriod").value(4));
    }

    @Test
    void saveMonthlyPlanRejectsInvalidPayload() throws Exception {
        mockMvc.perform(put("/api/mentors/me/plans")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"","price":-5,"sessionDurationMinutes":0,
                                 "callsPerPeriod":-1,"description":""}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
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
