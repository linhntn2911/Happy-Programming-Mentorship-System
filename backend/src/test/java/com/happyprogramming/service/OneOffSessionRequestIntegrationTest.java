package com.happyprogramming.service;

import com.happyprogramming.dto.AuthenticatedUser;
import com.happyprogramming.dto.CreateOneOffSessionRequest;
import com.happyprogramming.dto.MentorRequestDecisionRequest;
import com.happyprogramming.dto.MentorRequestDecisionResponse;
import com.happyprogramming.dto.MentorshipRequestResponse;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * End-to-end coverage for the approval-first one-off session flow: a mentee requests a published
 * ONE_OFF offering (no payment), the mentor accepts/declines it exactly like a monthly request, and
 * the mentee receives one-off wording rather than checkout wording. Runs against the real schema so
 * the relaxed CK_requests_type constraint and the ONE_OFF insert path are exercised.
 */
@SpringBootTest
@Transactional
class OneOffSessionRequestIntegrationTest {
    private static final String AGENDA =
            "I would like a focused review of my Spring Boot REST controller, its validation and its tests.";

    @Autowired JdbcTemplate db;
    @Autowired MentorshipRequestService requests;
    @Autowired MentorDashboardService dashboard;

    long mentor;
    long mentee;
    String mentorSlug;
    long offeringId;

    private void login(long id, String name, String role) {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                new AuthenticatedUser(id, name, name.toLowerCase() + "@example.invalid", role),
                null, List.of(() -> "ROLE_" + role)));
    }

    @BeforeEach
    void setup() {
        String mentorEmail = UUID.randomUUID() + "@example.invalid";
        db.update("INSERT INTO dbo.users(email,full_name,role_code,status) VALUES (?,'One Off Mentor','MENTOR','ACTIVE')", mentorEmail);
        mentor = db.queryForObject("SELECT id FROM dbo.users WHERE email=?", Long.class, mentorEmail);
        mentorSlug = "oneoff-" + UUID.randomUUID();
        db.update("INSERT INTO dbo.mentor_profiles(user_id,slug,headline,job_title,company_name,biography,years_experience,is_public,approved_by,approved_at) "
                        + "VALUES (?,?,'Test','Engineer','Test','One-off integration test mentor biography covering reliable backend engineering.',6,1,?,SYSUTCDATETIME())",
                mentor, mentorSlug, mentor);
        db.update("INSERT INTO dbo.service_offerings(mentor_id,name,service_type,plan_tier,description,price,currency,"
                        + "session_duration_minutes,calls_per_period,chat_included,response_time_hours,trial_days,benefits,status,display_order,"
                        + "created_at,updated_at) VALUES (?,?,'ONE_OFF',NULL,?,500000,'VND',60,NULL,1,24,0,N'[]','ACTIVE',0,SYSUTCDATETIME(),SYSUTCDATETIME())",
                mentor, "Code review sprint", "A focused one-off code review session.");
        offeringId = db.queryForObject(
                "SELECT id FROM dbo.service_offerings WHERE mentor_id=? AND service_type='ONE_OFF'", Long.class, mentor);

        String menteeEmail = UUID.randomUUID() + "@example.invalid";
        db.update("INSERT INTO dbo.users(email,full_name,role_code,status) VALUES (?,'One Off Mentee','MENTEE','ACTIVE')", menteeEmail);
        mentee = db.queryForObject("SELECT id FROM dbo.users WHERE email=?", Long.class, menteeEmail);
    }

    @AfterEach
    void clear() { SecurityContextHolder.clearContext(); }

    private CreateOneOffSessionRequest payload(String agenda) {
        return new CreateOneOffSessionRequest(mentorSlug, offeringId, agenda, "MID", "v1");
    }

    @Test
    void createOneOffInsertsAPendingRequestAndNotifiesBothParties() {
        login(mentee, "One Off Mentee", "MENTEE");

        MentorshipRequestResponse response = requests.createOneOff(payload(AGENDA));

        assertNotNull(response.requestId());
        assertEquals("PENDING", response.status());
        assertFalse(response.paymentRequired());

        String serviceType = db.queryForObject(
                "SELECT service_type FROM dbo.mentorship_requests WHERE id=?", String.class, response.requestId());
        assertEquals("ONE_OFF", serviceType);
        Integer fundedNull = db.queryForObject(
                "SELECT COUNT(1) FROM dbo.mentorship_requests WHERE id=? AND funded_at IS NULL", Integer.class, response.requestId());
        assertEquals(1, fundedNull);

        Integer mentorNotice = db.queryForObject(
                "SELECT COUNT(1) FROM dbo.notifications WHERE user_id=? AND type='MENTORSHIP_REQUEST_RECEIVED'", Integer.class, mentor);
        assertEquals(1, mentorNotice);
        Integer menteeNotice = db.queryForObject(
                "SELECT COUNT(1) FROM dbo.notifications WHERE user_id=? AND type='MENTORSHIP_REQUEST_SUBMITTED'", Integer.class, mentee);
        assertEquals(1, menteeNotice);
    }

    @Test
    void mentorAcceptsAOneOffRequestWithoutPaymentAndMenteeGetsSessionCopy() {
        login(mentee, "One Off Mentee", "MENTEE");
        long requestId = requests.createOneOff(payload(AGENDA)).requestId();

        login(mentor, "One Off Mentor", "MENTOR");
        MentorRequestDecisionResponse decision =
                dashboard.decideOnRequest(requestId, new MentorRequestDecisionRequest("ACCEPTED"));
        assertEquals("ACCEPTED", decision.status());

        Integer stillUnfunded = db.queryForObject(
                "SELECT COUNT(1) FROM dbo.mentorship_requests WHERE id=? AND status='ACCEPTED' AND funded_at IS NULL",
                Integer.class, requestId);
        assertEquals(1, stillUnfunded);

        String message = db.queryForObject(
                "SELECT message FROM dbo.notifications WHERE user_id=? AND type='MENTORSHIP_REQUEST_ACCEPTED'",
                String.class, mentee);
        assertTrue(message.contains("arrange your session"), message);
        assertFalse(message.toLowerCase().contains("payment"), message);
    }

    @Test
    void createOneOffRejectsADuplicateActiveRequest() {
        login(mentee, "One Off Mentee", "MENTEE");
        requests.createOneOff(payload(AGENDA));

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> requests.createOneOff(payload(AGENDA)));
        assertEquals(409, error.getStatusCode().value());
    }

    @Test
    void createOneOffRejectsBookingYourself() {
        login(mentor, "One Off Mentor", "MENTOR");

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> requests.createOneOff(payload(AGENDA)));
        assertEquals(400, error.getStatusCode().value());
    }

    @Test
    void createOneOffRejectsAShortAgenda() {
        login(mentee, "One Off Mentee", "MENTEE");

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> requests.createOneOff(payload("Too short.")));
        assertEquals(400, error.getStatusCode().value());
    }

    @Test
    void createOneOffRejectsAnUnknownOrNonOneOffOffering() {
        login(mentee, "One Off Mentee", "MENTEE");

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> requests.createOneOff(new CreateOneOffSessionRequest(mentorSlug, 999_999_999L, AGENDA, "MID", "v1")));
        assertEquals(409, error.getStatusCode().value());
    }
}
