package com.happyprogramming.controller;

import com.happyprogramming.dto.CreateMentorshipRequest;
import com.happyprogramming.dto.MentorshipRequestResponse;
import com.happyprogramming.service.MentorshipRequestService;


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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(MentorshipRequestController.class)
@AutoConfigureMockMvc(addFilters = false)
class MentorshipRequestControllerTest {
    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private MentorshipRequestService mentorshipRequestService;

    private static final String VALID_BODY = """
            {"mentorSlug":"nam-nguyen","learningGoals":"%s","experienceLevel":"JUNIOR",
             "background":"Self-taught developer","expectations":"Weekly calls","termsVersion":"v1"}
            """;

    private static String goals() {
        return "I want to become a confident backend engineer and land my first full-time role within six months.";
    }

    @Test
    void createsRequestPendingMentorDecision() throws Exception {
        when(mentorshipRequestService.create(ArgumentMatchers.any(CreateMentorshipRequest.class)))
                .thenReturn(new MentorshipRequestResponse(
                        99L, "PENDING", false, Instant.parse("2026-10-08T02:00:00Z")));

        mockMvc.perform(post("/api/mentorship-requests")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(VALID_BODY.formatted(goals())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Mentorship request submitted."))
                .andExpect(jsonPath("$.data.requestId").value(99))
                .andExpect(jsonPath("$.data.status").value("PENDING"))
                .andExpect(jsonPath("$.data.paymentRequired").value(false));
    }

    @Test
    void rejectsShortLearningGoals() throws Exception {
        mockMvc.perform(post("/api/mentorship-requests")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(VALID_BODY.formatted("too short")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void rejectsUnknownExperienceLevel() throws Exception {
        mockMvc.perform(post("/api/mentorship-requests")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"mentorSlug":"nam-nguyen","learningGoals":"%s","experienceLevel":"EXPERT",
                                 "termsVersion":"v1"}
                                """.formatted(goals())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void unpublishedPackageConflictIsPropagated() throws Exception {
        when(mentorshipRequestService.create(ArgumentMatchers.any(CreateMentorshipRequest.class)))
                .thenThrow(new ResponseStatusException(HttpStatus.CONFLICT,
                        "This mentor has not published a monthly mentorship package yet."));

        mockMvc.perform(post("/api/mentorship-requests")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(VALID_BODY.formatted(goals())))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message")
                        .value("This mentor has not published a monthly mentorship package yet."));
    }

    @Test
    void anonymousRequestIsRejected() throws Exception {
        when(mentorshipRequestService.create(ArgumentMatchers.any(CreateMentorshipRequest.class)))
                .thenThrow(new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                        "Please log in to submit a mentorship request."));

        mockMvc.perform(post("/api/mentorship-requests")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(VALID_BODY.formatted(goals())))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false));
    }
}
