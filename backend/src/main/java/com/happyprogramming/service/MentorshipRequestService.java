package com.happyprogramming.service;

import com.happyprogramming.dto.AuthenticatedUser;
import com.happyprogramming.dto.CheckoutInfoDto;
import com.happyprogramming.dto.CheckoutRequest;
import com.happyprogramming.dto.CheckoutResponse;
import com.happyprogramming.dto.CreateMentorshipRequest;
import com.happyprogramming.dto.MentorshipRequestResponse;

import com.fasterxml.jackson.databind.ObjectMapper;

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

    @Transactional(readOnly = true)
    public CheckoutInfoDto getCheckoutInfo(Long requestId) {
        JdbcTemplate template = jdbc();
        AuthenticatedUser user = currentUser();
        if (user == null || user.id() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please log in to view checkout details.");
        }
        long menteeId = user.id();

        String sql = """
            SELECT r.id, r.mentee_id, r.mentor_id, r.service_id, r.status, r.learning_goals,
                   r.offer_snapshot, r.funded_at,
                   mu.full_name AS mentor_name,
                   mp.professional_title AS mentor_title,
                   mp.avatar_url AS mentor_avatar_url,
                   so.name AS package_name,
                   so.price,
                   so.currency,
                   so.session_duration_minutes,
                   so.calls_per_period,
                   so.trial_days
            FROM dbo.mentorship_requests r
            JOIN dbo.users mu ON mu.id = r.mentor_id
            LEFT JOIN dbo.mentor_profiles mp ON mp.user_id = r.mentor_id
            LEFT JOIN dbo.service_offerings so ON so.id = r.service_id
            WHERE r.id = ?
        """;

        List<Map<String, Object>> rows = template.queryForList(sql, requestId);
        if (rows.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Mentorship request not found.");
        }

        Map<String, Object> row = rows.get(0);
        long requestMenteeId = ((Number) row.get("mentee_id")).longValue();
        if (requestMenteeId != menteeId) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not authorized to view this checkout.");
        }

        String status = (String) row.get("status");
        boolean isPaid = row.get("funded_at") != null;

        BigDecimal amount = row.get("price") != null ? (BigDecimal) row.get("price") : BigDecimal.ZERO;
        String currency = row.get("currency") != null ? (String) row.get("currency") : "VND";
        Integer duration = row.get("session_duration_minutes") != null ? ((Number) row.get("session_duration_minutes")).intValue() : 45;
        Integer calls = row.get("calls_per_period") != null ? ((Number) row.get("calls_per_period")).intValue() : 4;
        Integer trialDays = row.get("trial_days") != null ? ((Number) row.get("trial_days")).intValue() : 7;
        String packageName = row.get("package_name") != null ? (String) row.get("package_name") : "Monthly Mentorship";

        String offerSnapshot = (String) row.get("offer_snapshot");
        if (offerSnapshot != null && !offerSnapshot.isBlank()) {
            try {
                var json = objectMapper.readTree(offerSnapshot);
                if (json.has("price")) amount = new BigDecimal(json.get("price").asText());
                if (json.has("currency")) currency = json.get("currency").asText();
                if (json.has("sessionDurationMinutes")) duration = json.get("sessionDurationMinutes").asInt();
                if (json.has("callsPerPeriod")) calls = json.get("callsPerPeriod").asInt();
                if (json.has("trialDays")) trialDays = json.get("trialDays").asInt();
                if (json.has("name")) packageName = json.get("name").asText();
            } catch (Exception ignored) {}
        }

        return new CheckoutInfoDto(
                requestId,
                ((Number) row.get("mentor_id")).longValue(),
                (String) row.get("mentor_name"),
                (String) row.get("mentor_title"),
                (String) row.get("mentor_avatar_url"),
                packageName,
                amount,
                currency,
                duration,
                calls,
                trialDays,
                (String) row.get("learning_goals"),
                status,
                isPaid,
                "MB Bank",
                "9876543210",
                "HAPPYPROGRAMMING ESCROW",
                "HP REQ " + requestId,
                900
        );
    }

    @Transactional
    public CheckoutResponse processCheckout(Long requestId, CheckoutRequest request) {
        JdbcTemplate template = jdbc();
        AuthenticatedUser user = currentUser();
        if (user == null || user.id() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please log in to complete payment.");
        }
        long menteeId = user.id();
        String menteeName = user.name() == null ? "A mentee" : user.name();

        String selectSql = """
            SELECT r.id, r.mentee_id, r.mentor_id, r.service_id, r.status, r.offer_snapshot,
                   r.funded_at, mu.full_name AS mentor_name, so.name AS package_name,
                   so.price AS offering_price, so.currency AS offering_currency
            FROM dbo.mentorship_requests r
            JOIN dbo.users mu ON mu.id = r.mentor_id
            LEFT JOIN dbo.service_offerings so ON so.id = r.service_id
            WHERE r.id = ?
        """;
        List<Map<String, Object>> rows = template.queryForList(selectSql, requestId);
        if (rows.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Mentorship request not found.");
        }

        Map<String, Object> req = rows.get(0);
        long requestMenteeId = ((Number) req.get("mentee_id")).longValue();
        if (requestMenteeId != menteeId) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not authorized to pay for this request.");
        }

        String status = (String) req.get("status");
        if (!"ACCEPTED".equals(status)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Payment is only allowed for accepted requests.");
        }

        if (req.get("funded_at") != null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This request has already been paid and activated.");
        }

        long mentorId = ((Number) req.get("mentor_id")).longValue();
        long serviceId = ((Number) req.get("service_id")).longValue();
        String mentorName = (String) req.get("mentor_name");
        String packageName = req.get("package_name") != null ? (String) req.get("package_name") : "Monthly Mentorship";
        String offerSnapshot = (String) req.get("offer_snapshot");

        BigDecimal amount = BigDecimal.ZERO;
        String currency = "VND";
        try {
            if (offerSnapshot != null && !offerSnapshot.isBlank()) {
                var json = objectMapper.readTree(offerSnapshot);
                if (json.has("price")) amount = new BigDecimal(json.get("price").asText());
                if (json.has("currency")) currency = json.get("currency").asText();
                if (json.has("name")) packageName = json.get("name").asText();
            }
        } catch (Exception ignored) {}

        if ((amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) && req.get("offering_price") != null) {
            amount = (BigDecimal) req.get("offering_price");
        }
        if (currency == null || currency.isBlank()) {
            currency = req.get("offering_currency") != null ? (String) req.get("offering_currency") : "VND";
        }
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            amount = new BigDecimal("2000000.00");
        }

        Instant nowInstant = Instant.now().truncatedTo(java.time.temporal.ChronoUnit.MILLIS);
        java.sql.Timestamp now = java.sql.Timestamp.from(nowInstant);
        java.sql.Timestamp expiresAt = java.sql.Timestamp.from(nowInstant.plus(15, java.time.temporal.ChronoUnit.MINUTES));
        java.sql.Timestamp trialEnd = java.sql.Timestamp.from(nowInstant.plus(7, java.time.temporal.ChronoUnit.DAYS));
        java.sql.Timestamp periodEnd = java.sql.Timestamp.from(nowInstant.plus(30, java.time.temporal.ChronoUnit.DAYS));

        String merchantRef = "HP-REQ-" + requestId + "-" + System.currentTimeMillis();

        // 1. Insert Payment
        KeyHolder paymentKeyHolder = new GeneratedKeyHolder();
        BigDecimal finalAmount = amount;
        String finalCurrency = currency;
        template.update(con -> {
            PreparedStatement ps = con.prepareStatement("""
                INSERT INTO dbo.payments (
                    request_id, billing_cycle_no, attempt_no, gateway, merchant_reference,
                    amount, currency, commission_rate_snapshot, status, expires_at, paid_at,
                    billing_period_start, billing_period_end, created_at, updated_at
                ) VALUES (?, 1, 1, 'VNPAY', ?, ?, ?, 15.00, 'SUCCEEDED', ?, ?, ?, ?, ?, ?)
            """, new String[]{"id"});
            ps.setLong(1, requestId);
            ps.setString(2, merchantRef);
            ps.setBigDecimal(3, finalAmount);
            ps.setString(4, finalCurrency);
            ps.setTimestamp(5, expiresAt);
            ps.setTimestamp(6, now);
            ps.setTimestamp(7, now);
            ps.setTimestamp(8, periodEnd);
            ps.setTimestamp(9, now);
            ps.setTimestamp(10, now);
            return ps;
        }, paymentKeyHolder);

        Number pIdNum = paymentKeyHolder.getKey();
        if (pIdNum == null) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Payment could not be recorded.");
        }
        long paymentId = pIdNum.longValue();

        // 2. Insert Escrow Ledger HOLD
        template.update("""
            INSERT INTO dbo.escrow_ledger_entries (
                payment_id, entry_type, amount, idempotency_key, created_by, created_at
            ) VALUES (?, 'HOLD', ?, ?, ?, ?)
        """, paymentId, finalAmount, "ESCROW-HOLD-" + paymentId, menteeId, now);

        // 3. Update Mentorship Request funded_at
        template.update("""
            UPDATE dbo.mentorship_requests
            SET funded_at = ?, updated_at = ?
            WHERE id = ? AND status = 'ACCEPTED' AND funded_at IS NULL
        """, now, now, requestId);

        // 4. Insert Subscription
        KeyHolder subKeyHolder = new GeneratedKeyHolder();
        template.update(con -> {
            PreparedStatement ps = con.prepareStatement("""
                INSERT INTO dbo.subscriptions (
                    request_id, service_id, mentor_id, mentee_id, agreed_price, currency,
                    plan_snapshot, status, activated_at, trial_ends_at, current_period_start,
                    current_period_end, next_billing_at, renewal_mode, cancel_at_period_end,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'TRIALING', ?, ?, ?, ?, ?, 'MANUAL', 0, ?, ?)
            """, new String[]{"id"});
            ps.setLong(1, requestId);
            ps.setLong(2, serviceId);
            ps.setLong(3, mentorId);
            ps.setLong(4, menteeId);
            ps.setBigDecimal(5, finalAmount);
            ps.setString(6, finalCurrency);
            ps.setString(7, offerSnapshot);
            ps.setTimestamp(8, now);
            ps.setTimestamp(9, trialEnd);
            ps.setTimestamp(10, now);
            ps.setTimestamp(11, periodEnd);
            ps.setTimestamp(12, periodEnd);
            ps.setTimestamp(13, now);
            ps.setTimestamp(14, now);
            return ps;
        }, subKeyHolder);

        Number subIdNum = subKeyHolder.getKey();
        long subscriptionId = subIdNum != null ? subIdNum.longValue() : 0L;

        // 5. Create notifications
        notificationService.create(
                menteeId,
                "Payment confirmed - 7-day trial active!",
                "Your payment for " + packageName + " was successful. Your 7-day trial is now active. Funds are secured in Escrow.",
                "PAYMENT_SUCCESS",
                "#/account");

        notificationService.create(
                mentorId,
                "Mentorship activated",
                menteeName + " completed payment for " + packageName + ". The mentorship workspace is ready.",
                "MENTORSHIP_ACTIVATED",
                "#/mentor/dashboard");

        return new CheckoutResponse(
                subscriptionId,
                requestId,
                "TRIALING",
                finalAmount,
                finalCurrency,
                nowInstant,
                trialEnd.toInstant(),
                "Payment completed successfully. 7-day trial active."
        );
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
