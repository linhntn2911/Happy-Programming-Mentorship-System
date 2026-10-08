package com.happyprogramming.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.happyprogramming.dto.AuthenticatedUser;
import com.happyprogramming.dto.CreateMentorshipRequest;
import com.happyprogramming.dto.MentorshipRequestResponse;

import java.math.BigDecimal;
import java.sql.PreparedStatement;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class MentorshipRequestService {
    private static final int MIN_GOALS_LENGTH = 50;

    private static final String SELECT_MENTOR = """
            SELECT TOP 1 mp.user_id, u.full_name
            FROM dbo.mentor_profiles mp
            JOIN dbo.users u ON u.id = mp.user_id
            WHERE mp.slug = ? AND mp.is_public = 1 AND u.status = 'ACTIVE'
            """;

    private static final String SELECT_ACTIVE_MONTHLY_OFFERING = """
            SELECT TOP 1 id, name, price, currency, session_duration_minutes, calls_per_period, trial_days
            FROM dbo.service_offerings
            WHERE mentor_id = ? AND service_type = 'MONTHLY' AND status = 'ACTIVE'
            ORDER BY display_order, id
            """;

    private static final String COUNT_ACTIVE_REQUESTS = """
            SELECT COUNT(1) FROM dbo.mentorship_requests
            WHERE mentee_id = ? AND mentor_id = ?
              AND status IN ('PENDING', 'ACCEPTED')
            """;

    private static final String INSERT_REQUEST = """
            INSERT INTO dbo.mentorship_requests
                (mentee_id, mentor_id, service_id, service_type, experience_level, background,
                 learning_goals, expectations, project_links, offer_snapshot, status, submitted_at,
                 response_deadline, terms_version, terms_accepted_at, created_at, updated_at)
            VALUES
                (?, ?, ?, 'MONTHLY', ?, ?, ?, ?, N'[]', ?, 'PENDING', ?,
                 DATEADD(HOUR, 48, ?), ?, ?, ?, ?)
            """;

    private final JdbcTemplate jdbcTemplate;
    private final NotificationService notificationService;
    private final ObjectMapper objectMapper;

    public MentorshipRequestService(
            @Autowired(required = false) JdbcTemplate jdbcTemplate,
            NotificationService notificationService,
            ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.notificationService = notificationService;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public MentorshipRequestResponse create(CreateMentorshipRequest payload) {
        JdbcTemplate template = jdbc();
        AuthenticatedUser currentUser = currentUser();
        if (currentUser == null || currentUser.id() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please log in to submit a mentorship request.");
        }
        long menteeId = currentUser.id();
        String menteeName = currentUser.name() == null ? "A mentee" : currentUser.name();

        String learningGoals = payload.learningGoals() == null ? "" : payload.learningGoals().trim();
        if (learningGoals.length() < MIN_GOALS_LENGTH) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Learning goals must contain at least 50 characters.");
        }

        List<Map<String, Object>> mentors = template.queryForList(SELECT_MENTOR, payload.mentorSlug());
        if (mentors.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Mentor is not available for mentorship.");
        }
        long mentorId = ((Number) mentors.get(0).get("user_id")).longValue();
        String mentorName = String.valueOf(mentors.get(0).get("full_name"));
        if (mentorId == menteeId) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "You cannot request mentorship from yourself.");
        }

        List<Map<String, Object>> offerings =
                template.queryForList(SELECT_ACTIVE_MONTHLY_OFFERING, mentorId);
        if (offerings.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "This mentor has not published a monthly mentorship package yet.");
        }
        Map<String, Object> offering = offerings.get(0);
        long serviceId = ((Number) offering.get("id")).longValue();
        String planName = String.valueOf(offering.get("name"));

        Integer activeRequests = template.queryForObject(COUNT_ACTIVE_REQUESTS, Integer.class, menteeId, mentorId);
        if (activeRequests != null && activeRequests > 0) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "You already have an active mentorship request with this mentor.");
        }

        String offerSnapshot = buildOfferSnapshot(offering);

        java.sql.Timestamp submittedAt =
                java.sql.Timestamp.from(Instant.now().truncatedTo(java.time.temporal.ChronoUnit.MILLIS));

        KeyHolder keyHolder = new GeneratedKeyHolder();
        template.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(INSERT_REQUEST, new String[] {"id"});
            ps.setLong(1, menteeId);
            ps.setLong(2, mentorId);
            ps.setLong(3, serviceId);
            ps.setString(4, payload.experienceLevel());
            ps.setString(5, trimToNull(payload.background()));
            ps.setString(6, learningGoals);
            ps.setString(7, trimToNull(payload.expectations()));
            ps.setString(8, offerSnapshot);
            ps.setTimestamp(9, submittedAt);
            ps.setTimestamp(10, submittedAt);
            ps.setString(11, payload.termsVersion());
            ps.setTimestamp(12, submittedAt);
            ps.setTimestamp(13, submittedAt);
            ps.setTimestamp(14, submittedAt);
            return ps;
        }, keyHolder);

        Number generatedId = keyHolder.getKey();
        if (generatedId == null) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR, "Mentorship request could not be created.");
        }
        long requestId = generatedId.longValue();

        notificationService.create(
                mentorId,
                "New mentorship request",
                menteeName + " applied for " + planName + ". Review it in your mentor dashboard.",
                "MENTORSHIP_REQUEST_RECEIVED",
                "#/mentor/dashboard");
        notificationService.create(
                menteeId,
                "Mentorship request submitted",
                "Your request to " + mentorName + " was sent. They have 48 hours to respond; you can complete payment once they accept.",
                "MENTORSHIP_REQUEST_SUBMITTED",
                "#/account");

        return new MentorshipRequestResponse(requestId, "PENDING", false, Instant.now());
    }

    private String buildOfferSnapshot(Map<String, Object> offering) {
        Map<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("serviceId", offering.get("id"));
        snapshot.put("serviceType", "MONTHLY");
        snapshot.put("name", offering.get("name"));
        snapshot.put("price", offering.get("price"));
        snapshot.put("currency", offering.get("currency"));
        snapshot.put("sessionDurationMinutes", offering.get("session_duration_minutes"));
        snapshot.put("callsPerPeriod", offering.get("calls_per_period"));
        snapshot.put("trialDays", offering.get("trial_days"));
        try {
            return objectMapper.writeValueAsString(snapshot);
        } catch (Exception exception) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR, "Mentorship offer snapshot could not be serialized.");
        }
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private JdbcTemplate jdbc() {
        if (jdbcTemplate == null) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE, "Mentorship requests are temporarily unavailable.");
        }
        return jdbcTemplate;
    }

    private static AuthenticatedUser currentUser() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof AuthenticatedUser user) {
            return user;
        }
        return null;
    }
}
