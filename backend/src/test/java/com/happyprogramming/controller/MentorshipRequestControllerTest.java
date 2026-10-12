package com.happyprogramming.controller;

import com.happyprogramming.dto.CreateMentorshipRequest;
import com.happyprogramming.dto.MentorshipRequestResponse;
import com.happyprogramming.dto.MenteeApplicationDto;
import com.happyprogramming.dto.MenteeApplicationPageDto;
import com.happyprogramming.service.MentorshipRequestService;
import com.happyprogramming.service.SepayPaymentService;

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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(MentorshipRequestController.class)
@AutoConfigureMockMvc(addFilters = false)
class MentorshipRequestControllerTest {
    @MockitoBean
    private com.happyprogramming.service.StaffAccessService staffAccess;
    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private MentorshipRequestService mentorshipRequestService;
    @MockitoBean
    private SepayPaymentService sepayPaymentService;

    private static final String VALID_BODY = """
            {"mentorSlug":"nam-nguyen","learningGoals":"%s","experienceLevel":"JUNIOR",
             "background":"Self-taught developer","expectations":"Weekly calls","termsVersion":"v1",
             "serviceOfferingId":42}
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
        var requestCaptor = org.mockito.ArgumentCaptor.forClass(CreateMentorshipRequest.class);
        org.mockito.Mockito.verify(mentorshipRequestService).create(requestCaptor.capture());
        org.junit.jupiter.api.Assertions.assertEquals(42L, requestCaptor.getValue().serviceOfferingId());
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

    @Test
    void cancelsAnApplication() throws Exception {
        mockMvc.perform(post("/api/mentorship-requests/99/cancel"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Mentorship application cancelled. You can submit a new application with the current package."));
        org.mockito.Mockito.verify(mentorshipRequestService).cancelMyRequest(99L);
    }

    @Test
    void loadsCheckoutInfoForAcceptedRequest() throws Exception {
        when(mentorshipRequestService.getCheckoutInfo(99L))
                .thenReturn(new com.happyprogramming.dto.CheckoutInfoDto(
                        99L,
                        10L,
                        "Nam Nguyễn",
                        "Senior Backend Engineer",
                        null,
                        "Backend Mentorship",
                        new java.math.BigDecimal("2500000.00"),
                        "VND",
                        45,
                        4,
                        goals(),
                        "ACCEPTED",
                        false,
                        null,
                        null,
                        null,
                        true
                ));

        mockMvc.perform(get("/api/mentorship-requests/99/checkout-info"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.requestId").value(99))
                .andExpect(jsonPath("$.data.mentorName").value("Nam Nguyễn"))
                .andExpect(jsonPath("$.data.status").value("ACCEPTED"))
                .andExpect(jsonPath("$.data.amount").value(2500000.00))
                .andExpect(jsonPath("$.data.isPaid").value(false));
    }

    @Test
    void startsPendingSepayCheckout() throws Exception {
        when(sepayPaymentService.isEnabled()).thenReturn(true);
        when(sepayPaymentService.initiate(99L))
                .thenReturn(new com.happyprogramming.dto.CheckoutResponse(
                        813L, 99L, "PENDING", new java.math.BigDecimal("2500000.00"), "VND",
                        "HP99A1", "https://qr.sepay.vn/img?bank=TPBank&acc=00000806194&template=compact&amount=2500000&des=HP99A1",
                        Instant.parse("2026-10-12T07:00:00Z"), "SePay QR payment is ready.",
                        "https://qr.sepay.vn/img?bank=TPBank&acc=00000806194&template=compact&amount=2500000&des=HP99A1",
                        "TPBank", "00000806194", "NGUYEN THI NGOC LINH"
                ));

        mockMvc.perform(post("/api/mentorship-requests/99/checkout"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.paymentId").value(813))
                .andExpect(jsonPath("$.data.status").value("PENDING"))
                .andExpect(jsonPath("$.data.paymentReference").value("HP99A1"))
                .andExpect(jsonPath("$.data.bankName").value("TPBank"))
                .andExpect(jsonPath("$.data.accountNumber").value("00000806194"))
                .andExpect(jsonPath("$.data.accountHolder").value("NGUYEN THI NGOC LINH"))
                .andExpect(jsonPath("$.data.qrCodeUrl").value(org.hamcrest.Matchers.startsWith("https://qr.sepay.vn/")));
    }

    @Test
    void listsMyApplicationsWithStatusFilterAndPagination() throws Exception {
        when(mentorshipRequestService.getMyApplications(0, 10, "ACCEPTED"))
                .thenReturn(new MenteeApplicationPageDto(java.util.List.of(
                        new MenteeApplicationDto(99L, "Nam Nguyễn", "Backend Mentorship", goals(), "ACCEPTED",
                                Instant.parse("2026-10-08T02:00:00Z"), Instant.parse("2026-10-09T02:00:00Z"),
                                Instant.parse("2026-10-10T02:00:00Z"), null, null, null, null)), 1, 1, 0, 10));

        mockMvc.perform(get("/api/mentorship-requests/mine")
                        .param("page", "0")
                        .param("size", "10")
                        .param("status", "ACCEPTED"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements").value(1))
                .andExpect(jsonPath("$.data.applications[0].requestId").value(99))
                .andExpect(jsonPath("$.data.applications[0].status").value("ACCEPTED"));
    }
}
