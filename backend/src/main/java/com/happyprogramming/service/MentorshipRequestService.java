package com.happyprogramming.service;

import com.happyprogramming.dto.AuthenticatedUser;
import com.happyprogramming.dto.CheckoutInfoDto;
import com.happyprogramming.dto.CheckoutRequest;
import com.happyprogramming.dto.CheckoutResponse;
import com.happyprogramming.dto.CreateMentorshipRequest;
import com.happyprogramming.dto.MentorshipRequestResponse;
import com.happyprogramming.dto.MenteeApplicationDto;
import com.happyprogramming.dto.MenteeApplicationPageDto;

import com.fasterxml.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.sql.PreparedStatement;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
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
    private static final Set<String> APPLICATION_STATUSES = Set.of("PENDING", "ACCEPTED", "REJECTED", "EXPIRED", "CANCELLED");

    private static final String SELECT_MENTOR = """
            SELECT TOP 1 mp.user_id, u.full_name
            FROM dbo.mentor_profiles mp
            JOIN dbo.users u ON u.id = mp.user_id
            WHERE mp.slug = ? AND mp.is_public = 1 AND u.status = 'ACTIVE'
            """;

    private static final String SELECT_ACTIVE_MONTHLY_OFFERINGS = """
            SELECT id, name, plan_tier, price, currency, session_duration_minutes, calls_per_period, trial_days
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
                (?, ?, ?, 'MONTHLY', ?, ?, ?, ?, N'[]', ?, 'PENDING', SYSUTCDATETIME(),
                 DATEADD(HOUR, 48, SYSUTCDATETIME()), ?, SYSUTCDATETIME(), SYSUTCDATETIME(), SYSUTCDATETIME())
            """;

    private final JdbcTemplate jdbcTemplate;
    private final NotificationService notificationService;
    private final ObjectMapper objectMapper;
    private final SepayPaymentService sepayPaymentService;

    @Autowired
    public MentorshipRequestService(
            @Autowired(required = false) JdbcTemplate jdbcTemplate,
            NotificationService notificationService,
            ObjectMapper objectMapper,
            @Autowired(required = false) SepayPaymentService sepayPaymentService) {
        this.jdbcTemplate = jdbcTemplate;
        this.notificationService = notificationService;
        this.objectMapper = objectMapper;
        this.sepayPaymentService = sepayPaymentService;
    }

    public MentorshipRequestService(
            JdbcTemplate jdbcTemplate,
            NotificationService notificationService,
            ObjectMapper objectMapper) {
        this(jdbcTemplate, notificationService, objectMapper, null);
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
                template.queryForList(SELECT_ACTIVE_MONTHLY_OFFERINGS, mentorId);
        if (offerings.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "This mentor has not published a monthly mentorship package yet.");
        }
        Map<String, Object> offering;
        if (payload.serviceOfferingId() == null) {
            if (offerings.size() != 1) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Select a mentorship package from the mentor profile before applying.");
            }
            offering = offerings.get(0);
        } else {
            offering = offerings.stream()
                    .filter(candidate -> ((Number) candidate.get("id")).longValue() == payload.serviceOfferingId())
                    .findFirst()
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT,
                            "The selected package is no longer available. Refresh the mentor profile and choose an active package."));
        }
        long serviceId = ((Number) offering.get("id")).longValue();
        String planName = offeringDisplayName(offering);

        Integer activeRequests = template.queryForObject(COUNT_ACTIVE_REQUESTS, Integer.class, menteeId, mentorId);
        if (activeRequests != null && activeRequests > 0) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "You already have an active mentorship request with this mentor.");
        }

        String offerSnapshot = buildOfferSnapshot(offering);

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
            ps.setString(9, payload.termsVersion());
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
                "Your request to " + mentorName + " was sent. They have 48 hours to respond. Track its status in My applications.",
                "MENTORSHIP_REQUEST_SUBMITTED",
                "#/applications");

        return new MentorshipRequestResponse(requestId, "PENDING", false, Instant.now());
    }

    @Transactional(readOnly = true)
    public MenteeApplicationPageDto getMyApplications(int page, int size, String status) {
        JdbcTemplate template = jdbc();
        AuthenticatedUser user = currentUser();
        if (user == null || user.id() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please log in to view your applications.");
        }
        if (user.roles() == null || !user.roles().contains("MENTEE")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only mentees can view mentorship applications.");
        }
        if (page < 0 || size < 1 || size > 50) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid application page or size.");
        }
        String normalizedStatus = status == null || status.isBlank() ? null : status.trim().toUpperCase(java.util.Locale.ROOT);
        if (normalizedStatus != null && !APPLICATION_STATUSES.contains(normalizedStatus)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid mentorship application status.");
        }

        String predicate = normalizedStatus == null ? "" : " AND r.status = ?";
        Object[] countArgs = normalizedStatus == null
                ? new Object[] { user.id() }
                : new Object[] { user.id(), normalizedStatus };
        Long total = template.queryForObject(
                "SELECT COUNT_BIG(*) FROM dbo.mentorship_requests r WHERE r.mentee_id = ?" + predicate,
                Long.class,
                countArgs);
        long totalElements = total == null ? 0L : total;
        int totalPages = totalElements == 0 ? 0 : (int) Math.ceil((double) totalElements / size);
        long offset = (long) page * size;

        String sql = """
                SELECT r.id, mentor.full_name AS mentor_name,
                       COALESCE(JSON_VALUE(r.offer_snapshot, '$.name'), offering.name, 'Monthly Mentorship') AS package_name,
                       r.learning_goals, r.status, r.submitted_at, r.responded_at, r.response_deadline,
                       r.funded_at, r.rejection_reason, latest_payment.payment_status,
                       latest_payment.payment_expires_at
                FROM dbo.mentorship_requests r
                JOIN dbo.users mentor ON mentor.id = r.mentor_id
                JOIN dbo.service_offerings offering ON offering.id = r.service_id
                OUTER APPLY (
                    SELECT TOP (1) p.status AS payment_status, p.expires_at AS payment_expires_at
                    FROM dbo.payments p
                    WHERE p.request_id = r.id
                    ORDER BY p.billing_cycle_no DESC, p.attempt_no DESC, p.id DESC
                ) latest_payment
                WHERE r.mentee_id = ?
                """ + predicate + " ORDER BY r.submitted_at DESC, r.id DESC OFFSET ? ROWS FETCH NEXT ? ROWS ONLY";
        Object[] listArgs;
        if (normalizedStatus == null) {
            listArgs = new Object[] { user.id(), offset, size };
        } else {
            listArgs = new Object[] { user.id(), normalizedStatus, offset, size };
        }
        List<MenteeApplicationDto> applications = template.query(sql, (rs, rowNum) -> new MenteeApplicationDto(
                rs.getLong("id"),
                rs.getString("mentor_name"),
                rs.getString("package_name"),
                rs.getString("learning_goals"),
                rs.getString("status"),
                toInstant(rs.getTimestamp("submitted_at")),
                toInstant(rs.getTimestamp("responded_at")),
                toInstant(rs.getTimestamp("response_deadline")),
                toInstant(rs.getTimestamp("funded_at")),
                rs.getString("rejection_reason"),
                rs.getString("payment_status"),
                toInstant(rs.getTimestamp("payment_expires_at"))), listArgs);
        return new MenteeApplicationPageDto(applications, totalElements, totalPages, page, size);
    }

    @Transactional
    public void cancelMyRequest(Long requestId) {
        JdbcTemplate template = jdbc();
        AuthenticatedUser user = currentUser();
        if (user == null || user.id() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please log in to cancel this application.");
        }
        if (user.roles() == null || !user.roles().contains("MENTEE")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only mentees can cancel their applications.");
        }
        List<Map<String, Object>> rows = template.queryForList("""
                SELECT id, mentee_id, mentor_id, status, funded_at
                FROM dbo.mentorship_requests WITH (UPDLOCK, HOLDLOCK)
                WHERE id = ?
                """, requestId);
        if (rows.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Mentorship application not found.");
        }
        Map<String, Object> row = rows.get(0);
        if (((Number) row.get("mentee_id")).longValue() != user.id()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not authorized to cancel this application.");
        }
        String status = String.valueOf(row.get("status"));
        if (!("PENDING".equals(status) || "ACCEPTED".equals(status)) || row.get("funded_at") != null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Only pending or accepted unpaid applications can be cancelled.");
        }
        Integer completedPayments = template.queryForObject("""
                SELECT COUNT(1) FROM dbo.payments
                WHERE request_id = ? AND status = 'SUCCEEDED'
                """, Integer.class, requestId);
        if (completedPayments != null && completedPayments > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "This application has already been paid and cannot be cancelled.");
        }
        template.update("""
                UPDATE dbo.payments
                SET status = 'CANCELLED', failure_code = 'APPLICATION_CANCELLED',
                    failure_message = N'Mentee cancelled the application before payment.',
                    updated_at = SYSUTCDATETIME()
                WHERE request_id = ? AND status = 'PENDING'
                """, requestId);
        template.update("""
                UPDATE dbo.mentorship_requests
                SET status = 'CANCELLED', cancelled_at = SYSUTCDATETIME(), updated_at = SYSUTCDATETIME()
                WHERE id = ? AND mentee_id = ? AND status IN ('PENDING', 'ACCEPTED') AND funded_at IS NULL
                """, requestId, user.id());
        notificationService.create(
                ((Number) row.get("mentor_id")).longValue(),
                "Mentorship application cancelled",
                user.name() + " cancelled their mentorship application.",
                "MENTORSHIP_REQUEST_CANCELLED",
                "#/mentor/dashboard");
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
                   r.offer_snapshot, r.funded_at, r.submitted_at,
                   mu.full_name AS mentor_name,
                   mp.job_title AS mentor_title,
                   so.name AS package_name,
                   so.price,
                   so.currency,
                   so.session_duration_minutes,
                   so.calls_per_period,
                   so.status AS offering_status,
                   so.updated_at AS offering_updated_at,
                   latest_payment.payment_status,
                   latest_payment.payment_expires_at,
                   latest_payment.payment_reference
            FROM dbo.mentorship_requests r
            JOIN dbo.users mu ON mu.id = r.mentor_id
            LEFT JOIN dbo.mentor_profiles mp ON mp.user_id = r.mentor_id
            LEFT JOIN dbo.service_offerings so ON so.id = r.service_id
            OUTER APPLY (
                SELECT TOP (1) p.status AS payment_status, p.expires_at AS payment_expires_at,
                       CASE WHEN p.status='PENDING' THEN p.merchant_reference END AS payment_reference
                FROM dbo.payments p WHERE p.request_id = r.id ORDER BY p.attempt_no DESC
            ) latest_payment
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

        BigDecimal amount = null;
        String currency = "VND";
        Integer duration = row.get("session_duration_minutes") != null ? ((Number) row.get("session_duration_minutes")).intValue() : 45;
        Integer calls = row.get("calls_per_period") != null ? ((Number) row.get("calls_per_period")).intValue() : 4;
        String packageName = row.get("package_name") != null ? (String) row.get("package_name") : "Monthly Mentorship";

        String offerSnapshot = (String) row.get("offer_snapshot");
        boolean priceAvailable = false;
        if (offerSnapshot != null && !offerSnapshot.isBlank()) {
            try {
                var json = objectMapper.readTree(offerSnapshot);
                if (json.hasNonNull("price")) {
                    BigDecimal snapshotPrice = new BigDecimal(json.get("price").asText());
                    if (snapshotPrice.compareTo(BigDecimal.ZERO) > 0 && snapshotPrice.scale() <= 2) {
                        amount = snapshotPrice;
                        priceAvailable = true;
                    }
                }
                if (json.has("currency")) currency = json.get("currency").asText();
                if (json.has("sessionDurationMinutes")) duration = json.get("sessionDurationMinutes").asInt();
                if (json.has("callsPerPeriod")) calls = json.get("callsPerPeriod").asInt();
                if (json.has("name")) packageName = json.get("name").asText();
            } catch (Exception ignored) {}
        } else if (SepayPaymentService.isOfferingUnchangedSinceRequest(
                (java.sql.Timestamp) row.get("submitted_at"),
                (java.sql.Timestamp) row.get("offering_updated_at"))
                && "ACTIVE".equals(row.get("offering_status"))
                && row.get("price") instanceof BigDecimal currentPrice
                && currentPrice.compareTo(BigDecimal.ZERO) > 0 && currentPrice.scale() <= 2
                && "VND".equals(row.get("currency"))) {
            amount = currentPrice;
            currency = (String) row.get("currency");
            priceAvailable = true;
        }

        String qrCodeUrl = null;
        String bankName = null;
        String accountNumber = null;
        String accountHolder = null;
        String paymentReference = (String) row.get("payment_reference");
        if (sepayPaymentService != null && sepayPaymentService.isEnabled()
                && "PENDING".equals(row.get("payment_status"))
                && paymentReference != null && amount != null) {
            qrCodeUrl = sepayPaymentService.buildQrUrl(amount, paymentReference);
            bankName = sepayPaymentService.getBankName();
            accountNumber = sepayPaymentService.getAccountNumber();
            accountHolder = sepayPaymentService.getAccountHolder();
        }

        return new CheckoutInfoDto(
                requestId,
                ((Number) row.get("mentor_id")).longValue(),
                (String) row.get("mentor_name"),
                (String) row.get("mentor_title"),
                null,
                packageName,
                amount,
                currency,
                duration,
                calls,
                (String) row.get("learning_goals"),
                status,
                isPaid,
                (String) row.get("payment_status"),
                toInstant((java.sql.Timestamp) row.get("payment_expires_at")),
                paymentReference,
                priceAvailable,
                qrCodeUrl,
                bankName,
                accountNumber,
                accountHolder
        );
    }

    private String buildOfferSnapshot(Map<String, Object> offering) {
        Map<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("serviceId", offering.get("id"));
        snapshot.put("serviceType", "MONTHLY");
        snapshot.put("name", offeringDisplayName(offering));
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

    private static String offeringDisplayName(Map<String, Object> offering) {
        Object tier = offering.get("plan_tier");
        if (tier == null) return String.valueOf(offering.get("name"));
        return switch (String.valueOf(tier).toUpperCase(java.util.Locale.ROOT)) {
            case "LITE" -> "Lite";
            case "STANDARD" -> "Standard";
            case "PRO" -> "Pro";
            default -> String.valueOf(offering.get("name"));
        };
    }

    private static Instant toInstant(java.sql.Timestamp value) {
        return value == null ? null : value.toInstant();
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
