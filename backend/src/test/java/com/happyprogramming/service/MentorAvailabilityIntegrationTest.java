package com.happyprogramming.service;

import com.happyprogramming.dto.AuthenticatedUser;
import com.happyprogramming.dto.HoldSlotRequest;
import com.happyprogramming.dto.MentorAvailabilitySlotRequest;
import com.happyprogramming.dto.MentorAvailabilitySlotResponse;
import com.happyprogramming.dto.PublicAvailabilitySlotResponse;
import com.happyprogramming.dto.SlotHoldResponse;
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

import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest(properties = {
        "hpms.wallet.release.enabled=false",
        "hpms.availability.hold-expiry.enabled=false",
        "hpms.wallet.encryption-key=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="})
@Transactional
class MentorAvailabilityIntegrationTest {
    @Autowired JdbcTemplate db;
    @Autowired MentorAvailabilityService availability;
    @Autowired SlotHoldService slotHolds;

    long mentor;
    long mentee;
    long mentee2;
    long offering;
    String slug;

    void login(long id, String role) {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                new AuthenticatedUser(id, "Availability Test", "avail@example.invalid", role), null, List.of(() -> "ROLE_" + role)));
    }

    long insertUser(String role) {
        String email = UUID.randomUUID() + "@example.invalid";
        db.update("INSERT INTO dbo.users(email,full_name,role_code,status) VALUES (?,'Availability Test',?,'ACTIVE')", email, role);
        return db.queryForObject("SELECT id FROM dbo.users WHERE email=?", Long.class, email);
    }

    @BeforeEach
    void setup() {
        mentor = insertUser("MENTOR");
        mentee = insertUser("MENTEE");
        mentee2 = insertUser("MENTEE");
        slug = "avail-" + UUID.randomUUID();
        db.update("INSERT INTO dbo.mentor_profiles(user_id,slug,headline,job_title,company_name,biography,years_experience,is_public,approved_by,approved_at) "
                + "VALUES (?,?,'Test','Engineer','Test','Availability integration test mentor biography covering scheduling and reliable backend engineering.',5,1,?,SYSUTCDATETIME())",
                mentor, slug, mentor);
        db.update("INSERT INTO dbo.service_offerings(mentor_id,name,service_type,plan_tier,description,price,currency,session_duration_minutes,"
                + "calls_per_period,chat_included,response_time_hours,trial_days,benefits,status,display_order,created_at,updated_at) "
                + "VALUES (?,'Code review sprint','ONE_OFF',NULL,'Focused one-off code review session.',400000,'VND',60,NULL,1,24,0,N'[]','ACTIVE',0,SYSUTCDATETIME(),SYSUTCDATETIME())",
                mentor);
        offering = db.queryForObject("SELECT id FROM dbo.service_offerings WHERE mentor_id=? AND service_type='ONE_OFF'", Long.class, mentor);
    }

    @AfterEach
    void clear() { SecurityContextHolder.clearContext(); }

    private static Instant base() {
        return Instant.now().truncatedTo(ChronoUnit.MILLIS);
    }

    @Test
    void mentorPublishesAnOpenSlotAndSeesItListed() {
        login(mentor, "MENTOR");
        Instant start = base().plus(Duration.ofHours(3));
        MentorAvailabilitySlotResponse created =
                availability.createSlot(new MentorAvailabilitySlotRequest(start, start.plus(Duration.ofHours(2)), "Open for bookings"));

        assertTrue(created.id() > 0);
        assertEquals(start, created.startAt());
        List<MentorAvailabilitySlotResponse> mine = availability.listMySlots();
        assertEquals(1, mine.size());
        assertEquals(created.id(), mine.get(0).id());
    }

    @Test
    void createSlotRejectsAnOverlappingSlot() {
        login(mentor, "MENTOR");
        Instant start = base().plus(Duration.ofHours(3));
        availability.createSlot(new MentorAvailabilitySlotRequest(start, start.plus(Duration.ofHours(2)), null));

        ResponseStatusException error = assertThrows(ResponseStatusException.class, () ->
                availability.createSlot(new MentorAvailabilitySlotRequest(
                        start.plus(Duration.ofHours(1)), start.plus(Duration.ofHours(3)), null)));
        assertEquals(409, error.getStatusCode().value());
    }

    @Test
    void createSlotRejectsEndBeforeStart() {
        login(mentor, "MENTOR");
        Instant start = base().plus(Duration.ofHours(5));
        ResponseStatusException error = assertThrows(ResponseStatusException.class, () ->
                availability.createSlot(new MentorAvailabilitySlotRequest(start, start.minus(Duration.ofHours(2)), null)));
        assertEquals(400, error.getStatusCode().value());
    }

    @Test
    void deleteSlotRemovesTheMentorsSlot() {
        login(mentor, "MENTOR");
        Instant start = base().plus(Duration.ofHours(3));
        MentorAvailabilitySlotResponse created =
                availability.createSlot(new MentorAvailabilitySlotRequest(start, start.plus(Duration.ofHours(2)), null));

        availability.deleteSlot(created.id());
        assertTrue(availability.listMySlots().isEmpty());
    }

    @Test
    void holdRejectsBookingLessThanTwoHoursAhead() {
        login(mentee, "MENTEE");
        // BR-11: a session must be booked at least 2 hours before it starts.
        ResponseStatusException error = assertThrows(ResponseStatusException.class, () ->
                slotHolds.holdSlot(new HoldSlotRequest(slug, offering, base().plus(Duration.ofMinutes(30)))));
        assertEquals(400, error.getStatusCode().value());
    }

    @Test
    void holdRejectsTimeOutsidePublishedAvailability() {
        login(mentee, "MENTEE");
        ResponseStatusException error = assertThrows(ResponseStatusException.class, () ->
                slotHolds.holdSlot(new HoldSlotRequest(slug, offering, base().plus(Duration.ofHours(3)))));
        assertEquals(409, error.getStatusCode().value());
    }

    @Test
    void menteeHoldsAnOpenSlotForTenMinutesAndItBecomesUnavailable() {
        login(mentor, "MENTOR");
        Instant start = base().plus(Duration.ofHours(3));
        availability.createSlot(new MentorAvailabilitySlotRequest(start, start.plus(Duration.ofHours(2)), null));

        login(mentee, "MENTEE");
        Instant before = Instant.now();
        SlotHoldResponse hold = slotHolds.holdSlot(new HoldSlotRequest(slug, offering, start));
        Instant after = Instant.now();

        assertEquals("HELD", hold.status());
        assertEquals(start.plus(Duration.ofMinutes(60)), hold.endAt());
        // BR-10: the reservation lock expires 10 minutes after it is created.
        assertTrue(hold.expiresAt().isAfter(before.plus(Duration.ofMinutes(9))));
        assertTrue(hold.expiresAt().isBefore(after.plus(Duration.ofMinutes(11))));

        List<PublicAvailabilitySlotResponse> publicSlots = availability.listPublicSlots(slug, null, null);
        assertEquals(1, publicSlots.size());
        assertFalse(publicSlots.get(0).available());
    }

    @Test
    void secondMenteeCannotHoldAnOverlappingSlot() {
        login(mentor, "MENTOR");
        Instant start = base().plus(Duration.ofHours(3));
        availability.createSlot(new MentorAvailabilitySlotRequest(start, start.plus(Duration.ofHours(2)), null));

        login(mentee, "MENTEE");
        slotHolds.holdSlot(new HoldSlotRequest(slug, offering, start));

        login(mentee2, "MENTEE");
        ResponseStatusException error = assertThrows(ResponseStatusException.class, () ->
                slotHolds.holdSlot(new HoldSlotRequest(slug, offering, start.plus(Duration.ofMinutes(30)))));
        assertEquals(409, error.getStatusCode().value());
    }

    @Test
    void releaseSlotMakesTheSlotAvailableAgain() {
        login(mentor, "MENTOR");
        Instant start = base().plus(Duration.ofHours(3));
        availability.createSlot(new MentorAvailabilitySlotRequest(start, start.plus(Duration.ofHours(2)), null));

        login(mentee, "MENTEE");
        SlotHoldResponse hold = slotHolds.holdSlot(new HoldSlotRequest(slug, offering, start));
        slotHolds.releaseSlot(hold.id());

        List<PublicAvailabilitySlotResponse> publicSlots = availability.listPublicSlots(slug, null, null);
        assertEquals(1, publicSlots.size());
        assertTrue(publicSlots.get(0).available());
    }

    @Test
    void deleteSlotRejectsWhenTheSlotIsBooked() {
        login(mentor, "MENTOR");
        Instant start = base().plus(Duration.ofHours(3));
        MentorAvailabilitySlotResponse created =
                availability.createSlot(new MentorAvailabilitySlotRequest(start, start.plus(Duration.ofHours(2)), null));

        login(mentee, "MENTEE");
        slotHolds.holdSlot(new HoldSlotRequest(slug, offering, start));

        login(mentor, "MENTOR");
        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> availability.deleteSlot(created.id()));
        assertEquals(409, error.getStatusCode().value());
    }
}
