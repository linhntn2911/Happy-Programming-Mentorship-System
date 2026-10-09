package com.happyprogramming.role.mentor;

import com.happyprogramming.role.mentor.MentorProfileRequest;
import com.happyprogramming.role.mentor.MentorProfileResponse;
import com.happyprogramming.role.mentor.SkillTagResponse;
import com.happyprogramming.role.mentor.MentorDashboardService;
import com.happyprogramming.role.mentor.MentorService;

import com.happyprogramming.role.mentor.MentorCard;
import com.happyprogramming.role.mentor.MentorCatalog;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.web.server.ResponseStatusException;

@WebMvcTest(MentorController.class)
@AutoConfigureMockMvc(addFilters = false)
class MentorProfileControllerTest {
    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private MentorCatalog mentorCatalog;

    @MockitoBean
    private MentorService mentorService;

    @MockitoBean
    private MentorDashboardService mentorDashboardService;

    @Test
    void profileEndpointsDeclareReadAndWriteTransactions() throws Exception {
        Transactional controllerReadTransaction =
                MentorController.class.getMethod("getMyProfile").getAnnotation(Transactional.class);
        Transactional controllerWriteTransaction =
                MentorController.class.getMethod(
                        "updateMyProfile", MentorProfileRequest.class)
                        .getAnnotation(Transactional.class);
        Transactional serviceReadTransaction =
                MentorService.class.getMethod("getMyProfile").getAnnotation(Transactional.class);
        Transactional serviceWriteTransaction =
                MentorService.class.getMethod(
                        "updateMyProfile", MentorProfileRequest.class)
                        .getAnnotation(Transactional.class);

        assertTrue(controllerReadTransaction.readOnly());
        assertFalse(controllerWriteTransaction.readOnly());
        assertTrue(serviceReadTransaction.readOnly());
        assertFalse(serviceWriteTransaction.readOnly());
    }

    @Test
    void shouldPreserveFeaturedMentorResponse() throws Exception {
        when(mentorCatalog.search(
                any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(List.of(new MentorCard(
                        "minh-an", "Minh An Nguyen", "MA", "Senior Backend Engineer",
                        "FPT Software", "Backend", "6 years of experience", 6, "purple",
                        List.of("Java", "Spring Boot", "SQL Server"),
                        List.of("Vietnamese", "English"), "Vietnam", "2,500,000", 2500000,
                        "500,000", 4.9, 38, true, "Build better APIs.", "mentor-1.jpg")));

        mockMvc.perform(get("/api/mentors").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].id").value("minh-an"))
                .andExpect(jsonPath("$.data[0].name").value("Minh An Nguyen"));
    }

    @Test
    void shouldReturnProfileInsideApiResponseEnvelope() throws Exception {
        MentorProfileResponse response = new MentorProfileResponse(
                42L, "Mentor Example",
                "I help developers design reliable services and grow their engineering practice.",
                new BigDecimal("6.0"), null, null, null, List.of());
        when(mentorService.getMyProfile()).thenReturn(response);

        mockMvc.perform(get("/api/mentors/me/profile").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.userId").value(42))
                .andExpect(jsonPath("$.data.skills").isArray());
    }

    @Test
    void shouldAllowDevelopmentFrontendCorsForProfileAndDashboardRoutes() throws Exception {
        mockMvc.perform(options("/api/mentors/me/profile")
                        .header("Origin", "http://localhost:5173")
                        .header("Access-Control-Request-Method", "PUT")
                        .header("Access-Control-Request-Headers", "content-type,authorization"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "*"))
                .andExpect(header().exists("Access-Control-Allow-Methods"));

        mockMvc.perform(options("/api/mentors/me/dashboard")
                        .header("Origin", "http://localhost:5173")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "*"));
    }

    @Test
    void shouldReturnApiResponseEnvelopeWhenDemoIdentityIsDisabled() throws Exception {
        when(mentorService.getMyProfile())
                .thenThrow(new ResponseStatusException(
                        org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE,
                        "Mentor demo identity is not enabled."));

        mockMvc.perform(get("/api/mentors/me/profile"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Mentor demo identity is not enabled."));
    }

    @Test
    void shouldValidateProfileUpdateRequest() throws Exception {
        mockMvc.perform(put("/api/mentors/me/profile")
                        .contentType(MediaType.APPLICATION_JSON_VALUE)
                        .content("""
                                {
                                  "fullName": "",
                                  "biography": "Too short",
                                  "yearsExperience": 6.0,
                                  "githubUrl": "",
                                  "linkedinUrl": "",
                                  "portfolioUrl": "",
                                  "skillIds": [1]
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").isNotEmpty());
    }

    @Test
    void shouldUpdateProfileThroughServiceAndReturnEnvelope() throws Exception {
        MentorProfileResponse response = new MentorProfileResponse(
                42L, "Mentor Example",
                "I help developers design reliable services and grow their engineering practice.",
                new BigDecimal("6.0"), null, null, null, List.of());
        when(mentorService.updateMyProfile(any(MentorProfileRequest.class))).thenReturn(response);

        mockMvc.perform(put("/api/mentors/me/profile")
                        .contentType(MediaType.APPLICATION_JSON_VALUE)
                        .content("""
                                {
                                  "fullName": "Mentor Example",
                                  "biography": "I help developers design reliable services and grow their engineering practice.",
                                  "yearsExperience": 6.0,
                                  "githubUrl": "",
                                  "linkedinUrl": "",
                                  "portfolioUrl": "",
                                  "skillIds": [1]
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.fullName").value("Mentor Example"));
    }

    @Test
    void shouldReturnOnlyActiveSkillCatalogResponse() throws Exception {
        when(mentorService.getActiveSkills()).thenReturn(List.of(
                new SkillTagResponse(1L, 2L, "Java", "java", null)));

        mockMvc.perform(get("/api/skills").param("active", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].name").value("Java"));
    }

    @Test
    void shouldRejectInactiveSkillCatalogRequest() throws Exception {
        mockMvc.perform(get("/api/skills").param("active", "false"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }
}
