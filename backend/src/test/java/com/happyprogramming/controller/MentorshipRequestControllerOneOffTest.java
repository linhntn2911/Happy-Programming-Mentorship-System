package com.happyprogramming.controller;

import com.happyprogramming.dto.MentorshipRequestResponse;
import com.happyprogramming.service.MentorshipRequestService;
import com.happyprogramming.service.SepayPaymentService;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.happyprogramming.dto.CreateOneOffSessionRequest;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(MentorshipRequestController.class)
@AutoConfigureMockMvc(addFilters = false)
class MentorshipRequestControllerOneOffTest {
    @MockitoBean
    private com.happyprogramming.service.StaffAccessService staffAccess;
    @MockitoBean
    private MentorshipRequestService mentorshipRequestService;
    @MockitoBean
    private SepayPaymentService sepayPaymentService;
    @Autowired
    private MockMvc mockMvc;

    private static final String VALID_AGENDA =
            "Please review my REST controller design, validation approach and the accompanying integration tests.";

    private String body(String agenda, Long offeringId, String experience, String terms) {
        return "{"
                + "\"mentorSlug\":\"mentor-11\","
                + "\"serviceOfferingId\":" + (offeringId == null ? "null" : offeringId) + ","
                + "\"agenda\":" + (agenda == null ? "null" : "\"" + agenda + "\"") + ","
                + "\"experienceLevel\":" + (experience == null ? "null" : "\"" + experience + "\"") + ","
                + "\"termsVersion\":" + (terms == null ? "null" : "\"" + terms + "\"") + ","
                + "\"slotHoldId\":91,"
                + "\"numberOfSessions\":2,"
                + "\"numberOfParticipants\":3"
                + "}";
    }

    @Test
    void createOneOffReturnsCreatedAndDelegatesToTheService() throws Exception {
        when(mentorshipRequestService.createOneOff(any()))
                .thenReturn(new MentorshipRequestResponse(55L, "ACCEPTED", true, Instant.parse("2026-10-14T02:00:00Z")));

        mockMvc.perform(post("/api/one-off-requests")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(VALID_AGENDA, 17L, "MID", "v1")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.requestId").value(55))
                .andExpect(jsonPath("$.data.status").value("ACCEPTED"))
                .andExpect(jsonPath("$.data.paymentRequired").value(true));

        ArgumentCaptor<CreateOneOffSessionRequest> captor = ArgumentCaptor.forClass(CreateOneOffSessionRequest.class);
        verify(mentorshipRequestService).createOneOff(captor.capture());
        assertThat(captor.getValue().serviceOfferingId()).isEqualTo(17L);
        assertThat(captor.getValue().agenda()).isEqualTo(VALID_AGENDA);
        assertThat(captor.getValue().experienceLevel()).isEqualTo("MID");
        assertThat(captor.getValue().slotHoldId()).isEqualTo(91L);
        assertThat(captor.getValue().numberOfSessions()).isEqualTo(2);
        assertThat(captor.getValue().numberOfParticipants()).isEqualTo(3);
    }

    @Test
    void createOneOffRejectsAShortAgenda() throws Exception {
        mockMvc.perform(post("/api/one-off-requests")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("Too short.", 17L, "MID", "v1")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createOneOffRequiresAnOfferingId() throws Exception {
        mockMvc.perform(post("/api/one-off-requests")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(VALID_AGENDA, null, "MID", "v1")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createOneOffRejectsAnInvalidExperienceLevel() throws Exception {
        mockMvc.perform(post("/api/one-off-requests")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(VALID_AGENDA, 17L, "EXPERT", "v1")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createOneOffRequiresTermsVersion() throws Exception {
        mockMvc.perform(post("/api/one-off-requests")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(VALID_AGENDA, 17L, "MID", null)))
                .andExpect(status().isBadRequest());
    }
}
