package com.happyprogramming.controller;

import com.happyprogramming.dto.DisputeFileDownload;
import com.happyprogramming.dto.MentorDisputeDetail;
import com.happyprogramming.dto.MentorDisputeSummary;
import com.happyprogramming.service.MentorDisputeService;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentMatchers;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(MentorDisputeController.class)
@AutoConfigureMockMvc(addFilters = false)
class MentorDisputeControllerTest {
    @MockitoBean
    private com.happyprogramming.service.StaffAccessService staffAccess;
    @MockitoBean
    private MentorDisputeService disputes;
    @Autowired
    private MockMvc mockMvc;

    private static MentorDisputeSummary summary() {
        return new MentorDisputeSummary(5L, "SUBMITTED", "NO_SHOW", "Mentor never joined the session.",
                "BOOKING", 9L, "Session DEV-FB-ONEOFF-1", "Nguyen Van An", null, 1, false,
                Instant.parse("2026-11-01T02:00:00Z"), Instant.parse("2026-11-01T02:00:00Z"));
    }

    private static MentorDisputeDetail detail() {
        var evidence = new MentorDisputeDetail.Evidence(31L, 77L, "session-log.txt", "text/plain", 128L,
                "MENTEE", Instant.parse("2026-11-01T02:00:00Z"));
        var response = new MentorDisputeDetail.Response(12L, "MENTOR", "Nguyen Mentor",
                "I was stuck in another session and notified the mentee by email.",
                Instant.parse("2026-11-02T02:00:00Z"), List.of());
        return new MentorDisputeDetail(5L, "IN_MEDIATION", "NO_SHOW", "Mentor never joined the session.",
                "BOOKING", 9L, "Session DEV-FB-ONEOFF-1", "Nguyen Van An", null, null, null,
                Instant.parse("2026-11-01T02:00:00Z"), true, List.of(evidence), List.of(response));
    }

    @Test
    void listsTheMentorDisputesWithAnOptionalStatusFilter() throws Exception {
        when(disputes.list("SUBMITTED")).thenReturn(List.of(summary()));

        mockMvc.perform(get("/api/mentors/me/disputes").param("status", "SUBMITTED"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].id").value(5))
                .andExpect(jsonPath("$.data[0].status").value("SUBMITTED"))
                .andExpect(jsonPath("$.data[0].targetLabel").value("Session DEV-FB-ONEOFF-1"))
                .andExpect(jsonPath("$.data[0].responded").value(false));
        verify(disputes).list("SUBMITTED");
    }

    @Test
    void unknownStatusFilterIsRejected() throws Exception {
        when(disputes.list("CLOSED"))
                .thenThrow(new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown dispute status filter."));

        mockMvc.perform(get("/api/mentors/me/disputes").param("status", "CLOSED"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void detailExposesTheComplaintEvidenceAndResponseTrail() throws Exception {
        when(disputes.detail(5L)).thenReturn(detail());

        mockMvc.perform(get("/api/mentors/me/disputes/5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("IN_MEDIATION"))
                .andExpect(jsonPath("$.data.evidence[0].fileName").value("session-log.txt"))
                .andExpect(jsonPath("$.data.evidence[0].fileId").value(77))
                .andExpect(jsonPath("$.data.responses[0].authorSide").value("MENTOR"))
                .andExpect(jsonPath("$.data.responses[0].message").value("I was stuck in another session and notified the mentee by email."));
    }

    @Test
    void mentorCanSubmitAResponseWithEvidence() throws Exception {
        when(disputes.respond(ArgumentMatchers.eq(5L), ArgumentMatchers.anyString(), ArgumentMatchers.anyList()))
                .thenReturn(detail());
        MockMultipartFile file = new MockMultipartFile("files", "proof.png", "image/png", new byte[] {1, 2, 3});

        mockMvc.perform(multipart("/api/mentors/me/disputes/5/responses")
                        .file(file)
                        .param("message", "I was stuck in another session and notified the mentee by email."))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.message").value("Response submitted for staff review."))
                .andExpect(jsonPath("$.data.responded").value(true));
    }

    @Test
    void closedDisputesNoLongerAcceptResponses() throws Exception {
        when(disputes.respond(ArgumentMatchers.eq(6L), ArgumentMatchers.anyString(), ArgumentMatchers.any()))
                .thenThrow(new ResponseStatusException(HttpStatus.CONFLICT, "This dispute is closed and no longer accepts responses."));

        mockMvc.perform(multipart("/api/mentors/me/disputes/6/responses").param("message", "Late explanation from the mentor."))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void theMentorCannotResolveOrCloseADispute() throws Exception {
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .patch("/api/mentors/me/disputes/5").content("{\"status\":\"RESOLVED\"}"))
                .andExpect(status().isMethodNotAllowed());
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .delete("/api/mentors/me/disputes/5"))
                .andExpect(status().isMethodNotAllowed());
    }

    @Test
    void evidenceDownloadsAsAnAttachment() throws Exception {
        when(disputes.downloadEvidence(5L, 31L))
                .thenReturn(new DisputeFileDownload("session-log.txt", "text/plain", 3L, new byte[] {7, 8, 9}));

        mockMvc.perform(get("/api/mentors/me/disputes/5/evidence/31/file"))
                .andExpect(status().isOk())
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().string("Content-Type", "text/plain"))
                .andExpect(header().string("Content-Disposition",
                        org.hamcrest.Matchers.containsString("attachment")))
                .andExpect(content().bytes(new byte[] {7, 8, 9}));
    }

    @Test
    void disputesOfAnotherMentorAreNotReadable() throws Exception {
        when(disputes.detail(9L))
                .thenThrow(new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not the respondent of this dispute."));

        mockMvc.perform(get("/api/mentors/me/disputes/9"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false));
    }
}
