package com.happyprogramming.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.happyprogramming.dto.AuthenticatedUser;
import com.happyprogramming.dto.CheckoutResponse;
import com.happyprogramming.dto.SepayWebhookPayload;
import com.happyprogramming.dto.SepayWebhookResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.sql.PreparedStatement;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class SepayPaymentService {
    private static final Pattern CODE_PATTERN = Pattern.compile("HP\\d+(?:A\\d+)?", Pattern.CASE_INSENSITIVE);
    private static final DateTimeFormatter SEPAY_TRANSACTION_TIME = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final ZoneId SEPAY_TIME_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;
    private final boolean enabled;
    private final String bankName;
    private final String accountNumber;
    private final String accountHolder;
    private final String apiKey;
    private final String qrTemplate;

    public SepayPaymentService(
            @Autowired(required = false) JdbcTemplate jdbc,
            ObjectMapper mapper,
            @Value("${hpms.sepay.enabled:true}") boolean enabled,
            @Value("${hpms.sepay.bank-name:TPBank}") String bankName,
            @Value("${hpms.sepay.account-number:00000806194}") String accountNumber,
            @Value("${hpms.sepay.account-holder:NGUYEN THI NGOC LINH}") String accountHolder,
            @Value("${hpms.sepay.api-key:}") String apiKey,
            @Value("${hpms.sepay.qr-template:compact}") String qrTemplate) {
        this.jdbc = jdbc;
        this.mapper = mapper;
        this.enabled = enabled;
        this.bankName = bankName;
        this.accountNumber = accountNumber;
        this.accountHolder = accountHolder;
        this.apiKey = apiKey;
        this.qrTemplate = qrTemplate;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public String getBankName() {
        return bankName;
    }

    public String getAccountNumber() {
        return accountNumber;
    }

    public String getAccountHolder() {
        return accountHolder;
    }

    public String buildQrUrl(BigDecimal amount, String code) {
        long amountLong = amount != null ? amount.longValue() : 0L;
        return String.format("https://qr.sepay.vn/img?bank=%s&acc=%s&template=%s&amount=%d&des=%s",
                URLEncoder.encode(bankName, StandardCharsets.UTF_8),
                URLEncoder.encode(accountNumber, StandardCharsets.UTF_8),
                URLEncoder.encode(qrTemplate, StandardCharsets.UTF_8),
                amountLong,
                URLEncoder.encode(code, StandardCharsets.UTF_8));
    }

    @Transactional
    public CheckoutResponse initiate(Long requestId) {
        if (!enabled) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "SePay payment gateway is currently disabled.");
        }
        requireConfigured();
        long menteeId = currentMenteeId();
        JdbcTemplate db = db();
        configureSqlServerSession(db);
        Map<String, Object> request = loadLockedRequest(db, requestId);
        requireOwnerAndPayable(request, menteeId, requestId);

        Instant now = databaseNow(db);
        var active = db.query("""
                SELECT TOP (1) id, merchant_reference, amount, currency, created_at, expires_at, status
                FROM dbo.payments WITH (UPDLOCK, HOLDLOCK)
                WHERE request_id = ? AND status = 'PENDING'
                ORDER BY attempt_no DESC
                """, (rs, rowNum) -> Map.<String, Object>of(
                "id", rs.getLong("id"), "reference", rs.getString("merchant_reference"),
                "amount", rs.getBigDecimal("amount"), "currency", rs.getString("currency"),
                "createdAt", rs.getTimestamp("created_at"), "expiresAt", rs.getTimestamp("expires_at")), requestId);

        if (!active.isEmpty()) {
            Map<String, Object> payment = active.get(0);
            Instant expiresAt = sqlUtcInstant((Timestamp) payment.get("expiresAt"));
            if (expiresAt.isAfter(now)) {
                return buildCheckoutResponse(requestId, payment);
            }
            db.update("""
                    UPDATE dbo.payments SET status='EXPIRED', failure_code='CHECKOUT_TIMEOUT',
                        failure_message=N'Payment attempt expired before completion.', updated_at=?
                    WHERE id=? AND status='PENDING'
                    """, sqlUtcTimestamp(now), payment.get("id"));
        }

        String offerSnapshot = resolveOfferSnapshot(db, requestId, request);
        BigDecimal amount = amountFromSnapshot(offerSnapshot);
        if (!"VND".equals(currencyFromSnapshot(offerSnapshot))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "SePay checkout currently supports VND pricing only.");
        }

        BigDecimal queryCommission = db.query("""
                SELECT TRY_CONVERT(DECIMAL(5,2), JSON_VALUE(config_value, '$.value'))
                FROM dbo.system_configs WHERE config_key='finance.commission_rate'
                """, rs -> rs.next() ? rs.getBigDecimal(1) : null);
        final BigDecimal commission = (queryCommission == null || queryCommission.compareTo(BigDecimal.ZERO) < 0 || queryCommission.compareTo(new BigDecimal("100")) > 0)
                ? new BigDecimal("15.00")
                : queryCommission;

        int attemptNo = db.queryForObject("SELECT ISNULL(MAX(attempt_no),0)+1 FROM dbo.payments WITH (UPDLOCK, HOLDLOCK) WHERE request_id=?", Integer.class, requestId);
        Instant expiresAt = paymentExpiryFor(offerSnapshot, now, db);
        String reference = "HP" + requestId + "A" + attemptNo;

        KeyHolder keyHolder = new GeneratedKeyHolder();
        db.update(connection -> {
            PreparedStatement ps = connection.prepareStatement("""
                    INSERT INTO dbo.payments(request_id, billing_cycle_no, attempt_no, gateway, merchant_reference,
                        amount, currency, commission_rate_snapshot, status, expires_at, created_at, updated_at)
                    VALUES (?,1,?,'SEPAY',?,?,?,?,'PENDING',?,?,?)
                    """, new String[]{"id"});
            ps.setLong(1, requestId);
            ps.setInt(2, attemptNo);
            ps.setString(3, reference);
            ps.setBigDecimal(4, amount);
            ps.setString(5, "VND");
            ps.setBigDecimal(6, commission);
            ps.setTimestamp(7, sqlUtcTimestamp(expiresAt));
            ps.setTimestamp(8, sqlUtcTimestamp(now));
            ps.setTimestamp(9, sqlUtcTimestamp(now));
            return ps;
        }, keyHolder);

        Number id = keyHolder.getKey();
        if (id == null) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not create a SePay payment attempt.");
        }

        return buildCheckoutResponse(requestId, Map.of(
                "id", id.longValue(),
                "reference", reference,
                "amount", amount,
                "currency", "VND",
                "createdAt", sqlUtcTimestamp(now),
                "expiresAt", sqlUtcTimestamp(expiresAt)));
    }

    private CheckoutResponse buildCheckoutResponse(Long requestId, Map<String, Object> payment) {
        Long paymentId = ((Number) payment.get("id")).longValue();
        String reference = String.valueOf(payment.get("reference"));
        BigDecimal amount = (BigDecimal) payment.get("amount");
        String currency = String.valueOf(payment.get("currency"));
        Instant expiresAt = sqlUtcInstant((Timestamp) payment.get("expiresAt"));
        String qrUrl = buildQrUrl(amount, reference);

        return new CheckoutResponse(
                paymentId,
                requestId,
                "PENDING",
                amount,
                currency,
                reference,
                qrUrl,
                expiresAt,
                "SePay QR payment is ready.",
                qrUrl,
                bankName,
                accountNumber,
                accountHolder
        );
    }

    @Transactional
    public SepayWebhookResponse processWebhook(SepayWebhookPayload payload, String authHeader) {
        verifyAuth(authHeader);

        if (payload == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Payload is required.");
        }

        if (payload.transferType() == null || payload.transferType().isBlank()
                || payload.accountNumber() == null || payload.accountNumber().isBlank()
                || payload.id() == null || payload.id() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Transfer type, account and positive provider ID are required.");
        }
        if (!"in".equalsIgnoreCase(payload.transferType())) {
            return new SepayWebhookResponse(true, "Ignored non-inbound transfer: " + payload.transferType());
        }

        if (!accountNumber.trim().equalsIgnoreCase(payload.accountNumber().trim())) {
            return new SepayWebhookResponse(true, "Ignored: account number mismatch (" + payload.accountNumber() + ")");
        }

        String reference = extractOrderCode(payload);
        if (reference == null || reference.isBlank()) {
            return new SepayWebhookResponse(true, "Ignored: no order reference found in transfer content.");
        }

        JdbcTemplate db = db();
        configureSqlServerSession(db);
        var requestIds = db.queryForList("SELECT request_id FROM dbo.payments WHERE merchant_reference=? AND gateway='SEPAY' AND currency='VND'", Long.class, reference);
        if (requestIds.isEmpty()) return new SepayWebhookResponse(false, "Order not found. Manual reconciliation is required.");
        Map<String, Object> request = loadLockedRequest(db, requestIds.get(0));
        List<Map<String, Object>> payments = db.query("""
                SELECT id, request_id, amount, currency, status, merchant_reference, gateway_transaction_id,
                       created_at, expires_at
                FROM dbo.payments WITH (UPDLOCK, HOLDLOCK)
                WHERE merchant_reference = ? AND gateway='SEPAY' AND currency='VND'
                """, (rs, row) -> Map.<String, Object>of(
                "id", rs.getLong("id"),
                "requestId", rs.getLong("request_id"),
                "amount", rs.getBigDecimal("amount"),
                "currency", rs.getString("currency"),
                "status", rs.getString("status"),
                "reference", rs.getString("merchant_reference"),
                "transactionId", rs.getString("gateway_transaction_id") == null ? "" : rs.getString("gateway_transaction_id"),
                "createdAt", rs.getTimestamp("created_at"),
                "expiresAt", rs.getTimestamp("expires_at")), reference);

        if (payments.isEmpty()) {
            return new SepayWebhookResponse(false, "Order not found for code: " + reference);
        }

        Map<String, Object> payment = payments.get(0);
        Long paymentId = ((Number) payment.get("id")).longValue();
        Long requestId = ((Number) payment.get("requestId")).longValue();
        BigDecimal requiredAmount = (BigDecimal) payment.get("amount");

        if (!matchesExpectedAmount(payload.transferAmount(), requiredAmount)) {
            return new SepayWebhookResponse(false, String.format(
                    "Transfer amount %s does not match required amount %s. Manual reconciliation is required.",
                    payload.transferAmount(), requiredAmount));
        }

        String transactionId = String.valueOf(payload.id());

        String eventKey = "SEPAY:" + transactionId;
        var existingEvents = db.queryForList(
                "SELECT payment_id FROM dbo.payment_events WITH (UPDLOCK, HOLDLOCK) WHERE provider='SEPAY' AND (event_key=? OR JSON_VALUE(payload,'$.id')=?)",
                Long.class, eventKey, transactionId);
        if (!existingEvents.isEmpty()) {
            return new SepayWebhookResponse(paymentId.equals(existingEvents.get(0)), "Provider transaction already processed; reconcile any different order.");
        }

        if ("SUCCEEDED".equals(payment.get("status"))) {
            return new SepayWebhookResponse(transactionId.equals(payment.get("transactionId")), "Payment already completed; reconcile any additional transfer.");
        }

        Instant now = databaseNow(db);
        Instant transferredAt = transferOccurredAt(payload, now);
        Instant paymentCreatedAt = sqlUtcInstant((Timestamp) payment.get("createdAt"));
        Instant paymentExpiresAt = sqlUtcInstant((Timestamp) payment.get("expiresAt"));
        boolean transferWasInPaymentWindow = !transferredAt.isBefore(paymentCreatedAt.minusSeconds(60))
                && !transferredAt.isAfter(paymentExpiresAt)
                && !transferredAt.isAfter(now.plusSeconds(5 * 60L));
        if (!"PENDING".equals(payment.get("status")) || !transferWasInPaymentWindow) {
            return new SepayWebhookResponse(false, "Payment attempt is expired or closed. Manual reconciliation is required.");
        }

        if (!"ACCEPTED".equals(request.get("status")) || request.get("fundedAt") != null) {
            return new SepayWebhookResponse(false, "Application is not eligible for payment settlement.");
        }

        String offerSnapshot = (String) request.get("offerSnapshot");
        OneOffSettlement oneOff = loadOneOffSettlement(db, request, offerSnapshot, transferredAt);
        Timestamp paidTimestamp = sqlUtcTimestamp(transferredAt);
        Timestamp periodEnd = sqlUtcTimestamp(transferredAt.atZone(ZoneOffset.UTC).plusMonths(1).toInstant());

        db.update("""
                UPDATE dbo.payments SET status='SUCCEEDED', gateway='SEPAY', gateway_transaction_id=?, paid_at=?,
                    billing_period_start=?, billing_period_end=?, updated_at=?,
                    earnings_hold_days=(SELECT CAST(JSON_VALUE(config_value,'$.value.earningsHoldDays') AS INT)
                        FROM dbo.system_configs WHERE config_key='platform.operations')
                WHERE id=?
                """, transactionId, paidTimestamp, paidTimestamp, periodEnd, sqlUtcTimestamp(now), paymentId);

        db.update("""
                UPDATE dbo.payments SET status='CANCELLED', failure_code='OTHER_ATTEMPT_SUCCEEDED',
                    failure_message=N'Another payment attempt for this application completed.', updated_at=?
                WHERE request_id=? AND id<>? AND status='PENDING'
                """, sqlUtcTimestamp(now), requestId, paymentId);

        long menteeId = ((Number) request.get("menteeId")).longValue();
        long mentorId = ((Number) request.get("mentorId")).longValue();
        long serviceId = ((Number) request.get("serviceId")).longValue();

        db.update("""
                INSERT INTO dbo.escrow_ledger_entries(payment_id,entry_type,amount,idempotency_key,created_by,created_at)
                VALUES (?,'HOLD',?,?,?,?)
                """, paymentId, requiredAmount, "ESCROW-HOLD-" + paymentId, menteeId, paidTimestamp);

        db.update("UPDATE dbo.mentorship_requests SET funded_at=?, updated_at=? WHERE id=? AND status='ACCEPTED' AND funded_at IS NULL",
                paidTimestamp, sqlUtcTimestamp(now), requestId);

        if (oneOff != null) {
            confirmOneOffBookings(db, requestId, menteeId, mentorId, serviceId,
                    (String) request.get("learningGoals"), oneOff, transferredAt, now);
        } else {
            KeyHolder subscriptionKey = new GeneratedKeyHolder();
            db.update(connection -> {
                PreparedStatement ps = connection.prepareStatement("""
                        INSERT INTO dbo.subscriptions(request_id,service_id,mentor_id,mentee_id,agreed_price,currency,
                            plan_snapshot,status,activated_at,trial_ends_at,current_period_start,current_period_end,
                            next_billing_at,renewal_mode,cancel_at_period_end,created_at,updated_at)
                        VALUES (?,?,?,?,?,'VND',?,'TRIALING',?,DATEADD(DAY,7,?),?,?,?,'MANUAL',0,?,?)
                        """, new String[]{"id"});
                ps.setLong(1, requestId);
                ps.setLong(2, serviceId);
                ps.setLong(3, mentorId);
                ps.setLong(4, menteeId);
                ps.setBigDecimal(5, requiredAmount);
                ps.setString(6, offerSnapshot);
                ps.setTimestamp(7, paidTimestamp);
                ps.setTimestamp(8, paidTimestamp);
                ps.setTimestamp(9, paidTimestamp);
                ps.setTimestamp(10, periodEnd);
                ps.setTimestamp(11, periodEnd);
                ps.setTimestamp(12, sqlUtcTimestamp(now));
                ps.setTimestamp(13, sqlUtcTimestamp(now));
                return ps;
            }, subscriptionKey);

        }

        db.update("""
                IF EXISTS (SELECT 1 FROM dbo.conversations WITH (UPDLOCK,HOLDLOCK) WHERE mentor_id=? AND mentee_id=? AND conversation_type='MENTORSHIP')
                    UPDATE dbo.conversations SET inquiry_status='APPROVED', updated_at=?
                    WHERE mentor_id=? AND mentee_id=? AND conversation_type='MENTORSHIP';
                ELSE
                    INSERT INTO dbo.conversations(mentor_id,mentee_id,conversation_type,inquiry_status,created_at,updated_at)
                    VALUES (?,?,'MENTORSHIP','APPROVED',?,?);
                """, mentorId, menteeId, sqlUtcTimestamp(now), mentorId, menteeId,
                mentorId, menteeId, sqlUtcTimestamp(now), sqlUtcTimestamp(now));

        insertEvent(db, paymentId, eventKey, payload, "PROCESSED");

        return new SepayWebhookResponse(true, oneOff == null
                ? "Payment confirmed and mentorship activated."
                : "Payment confirmed and one-off session booking created.");
    }

    private void requireConfigured() {
        if (!enabled || apiKey == null || apiKey.isBlank() || accountNumber == null || accountNumber.isBlank()) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "SePay requires private configuration.");
    }

    /**
     * SQL Server requires these options when modifying tables that use filtered indexes.
     * Set them inside each payment transaction as a safeguard for a connection pool that was
     * created before configuration was reloaded.
     */
    private void configureSqlServerSession(JdbcTemplate db) {
        db.execute("""
                SET ANSI_NULLS ON;
                SET QUOTED_IDENTIFIER ON;
                SET ANSI_PADDING ON;
                SET ANSI_WARNINGS ON;
                SET ARITHABORT ON;
                SET CONCAT_NULL_YIELDS_NULL ON;
                SET NUMERIC_ROUNDABORT OFF;
                """);
    }

    /** Use SQL Server's clock for payment and slot-hold comparisons. */
    private Instant databaseNow(JdbcTemplate db) {
        Timestamp timestamp = db.queryForObject("SELECT SYSUTCDATETIME()", Timestamp.class);
        if (timestamp == null) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Payment timing could not be verified. Please try again.");
        }
        return sqlUtcInstant(timestamp);
    }

    private void verifyAuth(String authHeader) {
        requireConfigured();
        if (authHeader == null || authHeader.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing authorization header.");
        }
        String token = authHeader.trim();
        if (token.regionMatches(true, 0, "Apikey ", 0, 7)) {
            token = token.substring(7).trim();
        } else { throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Apikey authorization is required."); }
        if (!apiKey.trim().equals(token)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid SePay API key.");
        }
    }

    private String extractOrderCode(SepayWebhookPayload payload) {
        if (payload.code() != null && !payload.code().isBlank()) {
            Matcher matcher = CODE_PATTERN.matcher(payload.code().trim());
            if (matcher.find()) {
                return matcher.group().toUpperCase();
            }
        }
        if (payload.content() != null && !payload.content().isBlank()) {
            Matcher matcher = CODE_PATTERN.matcher(payload.content());
            if (matcher.find()) {
                return matcher.group().toUpperCase();
            }
        }
        return null;
    }

    static boolean matchesExpectedAmount(BigDecimal transferAmount, BigDecimal requiredAmount) {
        return transferAmount != null
                && requiredAmount != null
                && transferAmount.compareTo(requiredAmount) == 0;
    }

    static Instant transferOccurredAt(SepayWebhookPayload payload, Instant fallback) {
        if (payload != null && payload.transactionDate() != null && !payload.transactionDate().isBlank()) {
            try {
                return LocalDateTime.parse(payload.transactionDate().trim(), SEPAY_TRANSACTION_TIME)
                        .atZone(SEPAY_TIME_ZONE)
                        .toInstant();
            } catch (RuntimeException ignored) {
                // Preserve fail-closed expiry behavior when a provider timestamp is malformed.
            }
        }
        return fallback;
    }

    private void insertEvent(JdbcTemplate db, Long paymentId, String key, Object payloadObj, String status) {
        String jsonPayload;
        try {
            jsonPayload = mapper.writeValueAsString(payloadObj);
        } catch (JsonProcessingException ex) {
            jsonPayload = "{}";
        }
        db.update("""
                INSERT INTO dbo.payment_events(payment_id,provider,event_type,event_key,payload,signature_valid,processing_status,received_at,processed_at)
                VALUES (?,'SEPAY','WEBHOOK',?,?,1,?,SYSUTCDATETIME(),SYSUTCDATETIME())
                """, paymentId, key, jsonPayload, status);
    }

    private Map<String, Object> loadLockedRequest(JdbcTemplate db, Long requestId) {
        var rows = db.query("""
                SELECT r.id, r.mentee_id, r.mentor_id, r.service_id, r.service_type, r.status, r.funded_at,
                       r.offer_snapshot, r.learning_goals, r.submitted_at,
                       so.id AS linked_service_id, so.name AS linked_service_name,
                       so.price AS linked_service_price, so.currency AS linked_service_currency,
                       so.session_duration_minutes AS linked_session_duration_minutes,
                       so.calls_per_period AS linked_calls_per_period, so.trial_days AS linked_trial_days,
                       so.status AS linked_service_status, so.updated_at AS linked_service_updated_at
                FROM dbo.mentorship_requests r WITH (UPDLOCK, HOLDLOCK)
                LEFT JOIN dbo.service_offerings so WITH (UPDLOCK, HOLDLOCK)
                    ON so.id = r.service_id AND so.mentor_id = r.mentor_id AND so.service_type = r.service_type
                WHERE r.id=?
                """, (rs, row) -> {
            Map<String, Object> result = new java.util.HashMap<>();
            result.put("id", rs.getLong("id"));
            result.put("menteeId", rs.getLong("mentee_id"));
            result.put("mentorId", rs.getLong("mentor_id"));
            result.put("serviceId", rs.getLong("service_id"));
            result.put("serviceType", rs.getString("service_type"));
            result.put("status", rs.getString("status"));
            result.put("fundedAt", rs.getTimestamp("funded_at"));
            result.put("offerSnapshot", rs.getString("offer_snapshot"));
            result.put("learningGoals", rs.getString("learning_goals"));
            result.put("submittedAt", rs.getTimestamp("submitted_at"));
            result.put("linkedServiceId", rs.getObject("linked_service_id"));
            result.put("linkedServiceName", rs.getString("linked_service_name"));
            result.put("linkedServicePrice", rs.getBigDecimal("linked_service_price"));
            result.put("linkedServiceCurrency", rs.getString("linked_service_currency"));
            result.put("linkedSessionDurationMinutes", rs.getObject("linked_session_duration_minutes"));
            result.put("linkedCallsPerPeriod", rs.getObject("linked_calls_per_period"));
            result.put("linkedTrialDays", rs.getObject("linked_trial_days"));
            result.put("linkedServiceStatus", rs.getString("linked_service_status"));
            result.put("linkedServiceUpdatedAt", rs.getTimestamp("linked_service_updated_at"));
            return result;
        }, requestId);
        if (rows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Mentorship request not found.");
        return rows.get(0);
    }

    private String resolveOfferSnapshot(JdbcTemplate db, Long requestId, Map<String, Object> request) {
        Object currentSnapshot = request.get("offerSnapshot");
        if (currentSnapshot instanceof String snapshot && !snapshot.isBlank()) return snapshot;

        String recoveredSnapshot = recoverLegacyOfferSnapshot(mapper, request);
        int updated = db.update("""
                UPDATE dbo.mentorship_requests
                SET offer_snapshot=?, updated_at=SYSUTCDATETIME()
                WHERE id=? AND status='ACCEPTED' AND funded_at IS NULL
                """, recoveredSnapshot, requestId);
        if (updated != 1) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "The accepted package price could not be saved. Please refresh and try again.");
        }
        return recoveredSnapshot;
    }

    public static String recoverLegacyOfferSnapshot(ObjectMapper mapper, Map<String, Object> request) {
        Timestamp submittedAt = (Timestamp) request.get("submittedAt");
        Timestamp offeringUpdatedAt = (Timestamp) request.get("linkedServiceUpdatedAt");
        if (!isOfferingUnchangedSinceRequest(submittedAt, offeringUpdatedAt)
                || !"ACTIVE".equals(request.get("linkedServiceStatus"))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "The accepted package price cannot be verified. Ask the mentor to confirm the package before paying.");
        }

        Object serviceIdValue = request.get("linkedServiceId");
        Object priceValue = request.get("linkedServicePrice");
        BigDecimal price = priceValue instanceof BigDecimal value ? value : null;
        String currency = (String) request.get("linkedServiceCurrency");
        String name = (String) request.get("linkedServiceName");
        if (!(serviceIdValue instanceof Number serviceId) || serviceId.longValue() <= 0
                || price == null || price.compareTo(BigDecimal.ZERO) <= 0 || price.scale() > 2
                || !"VND".equals(currency) || name == null || name.isBlank()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "The accepted package price is unavailable.");
        }

        var snapshot = mapper.createObjectNode();
        snapshot.put("serviceId", serviceId.longValue());
        snapshot.put("serviceType", "MONTHLY");
        snapshot.put("name", name);
        snapshot.put("price", price.toPlainString());
        snapshot.put("currency", currency);
        putNullableNumber(snapshot, "sessionDurationMinutes", request.get("linkedSessionDurationMinutes"));
        putNullableNumber(snapshot, "callsPerPeriod", request.get("linkedCallsPerPeriod"));
        putNullableNumber(snapshot, "trialDays", request.get("linkedTrialDays"));
        try {
            return mapper.writeValueAsString(snapshot);
        } catch (JsonProcessingException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "The accepted package price could not be saved.");
        }
    }

    public static boolean isOfferingUnchangedSinceRequest(Timestamp submittedAt, Timestamp offeringUpdatedAt) {
        return submittedAt != null && offeringUpdatedAt != null && !offeringUpdatedAt.after(submittedAt);
    }

    private static void putNullableNumber(com.fasterxml.jackson.databind.node.ObjectNode target, String field, Object value) {
        if (value instanceof Number number) target.put(field, number.intValue());
        else target.putNull(field);
    }

    private void requireOwnerAndPayable(Map<String, Object> request, long menteeId, Long requestId) {
        if (((Number) request.get("menteeId")).longValue() != menteeId)
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not authorized to pay for this request.");
        if (!"ACCEPTED".equals(request.get("status")))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Payment is only allowed for accepted requests.");
        if (request.get("fundedAt") != null)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This request has already been paid and activated.");
    }

    BigDecimal amountFromSnapshot(Object snapshotValue) {
        if (!(snapshotValue instanceof String snapshot) || snapshot.isBlank())
            throw new ResponseStatusException(HttpStatus.CONFLICT, "The accepted package price is unavailable.");
        try {
            var json = mapper.readTree(snapshot);
            String amountText = "ONE_OFF".equals(json.path("serviceType").asText())
                    ? json.path("totalPrice").asText() : json.path("price").asText();
            BigDecimal amount = new BigDecimal(amountText);
            if (amount.compareTo(BigDecimal.ZERO) <= 0 || amount.scale() > 2)
                throw new IllegalArgumentException("Invalid amount");
            return amount;
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "The accepted package price is invalid.");
        }
    }

    private String currencyFromSnapshot(Object snapshotValue) {
        try {
            return mapper.readTree(String.valueOf(snapshotValue)).path("currency").asText("VND");
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "The accepted package currency is invalid.");
        }
    }

    private Instant paymentExpiryFor(String snapshot, Instant now, JdbcTemplate db) {
        try {
            var json = mapper.readTree(snapshot);
            if (!"ONE_OFF".equals(json.path("serviceType").asText())) return now.plusSeconds(15 * 60L);
            long holdId = json.path("slotHoldId").asLong(0);
            List<Timestamp> expiries = db.queryForList("""
                    SELECT expires_at FROM dbo.slot_holds
                    WHERE id=? AND status='HELD' AND expires_at>SYSUTCDATETIME()
                    """, Timestamp.class, holdId);
            if (expiries.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "The selected time is no longer reserved. Please choose another slot.");
            }
            return sqlUtcInstant(expiries.get(0));
        } catch (ResponseStatusException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "The one-off booking details are invalid.");
        }
    }

    private OneOffSettlement loadOneOffSettlement(
            JdbcTemplate db,
            Map<String, Object> request,
            String snapshot,
            Instant transferredAt) {
        if (!"ONE_OFF".equals(request.get("serviceType"))) return null;
        try {
            var json = mapper.readTree(snapshot);
            long holdId = json.path("slotHoldId").asLong(0);
            int sessions = json.path("numberOfSessions").asInt(0);
            int participants = json.path("numberOfParticipants").asInt(0);
            int durationMinutes = json.path("sessionDurationMinutes").asInt(0);
            BigDecimal unitPrice = new BigDecimal(json.path("price").asText());
            if (holdId <= 0 || sessions < 1 || sessions > 10 || participants < 1 || participants > 10
                    || durationMinutes < 10 || unitPrice.compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalArgumentException("Invalid one-off snapshot");
            }
            List<Map<String, Object>> holds = db.queryForList("""
                    SELECT start_at, end_at FROM dbo.slot_holds WITH (UPDLOCK, HOLDLOCK)
                    WHERE id=? AND mentee_id=? AND mentor_id=? AND service_id=? AND service_type='ONE_OFF'
                      AND status='HELD' AND expires_at>?
                    """, holdId, request.get("menteeId"), request.get("mentorId"), request.get("serviceId"), sqlUtcTimestamp(transferredAt));
            if (holds.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "The selected time expired before payment was verified. Manual reconciliation is required.");
            }
            Instant startAt = sqlUtcInstant((Timestamp) holds.get(0).get("start_at"));
            Instant endAt = sqlUtcInstant((Timestamp) holds.get(0).get("end_at"));
            if (java.time.Duration.between(startAt, endAt).toMinutes() != (long) sessions * durationMinutes) {
                throw new IllegalArgumentException("Held duration does not match the order");
            }
            return new OneOffSettlement(holdId, sessions, participants, durationMinutes, unitPrice, startAt, endAt);
        } catch (ResponseStatusException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "The one-off booking snapshot is invalid.");
        }
    }

    private void confirmOneOffBookings(
            JdbcTemplate db,
            long requestId,
            long menteeId,
            long mentorId,
            long serviceId,
            String agenda,
            OneOffSettlement order,
            Instant transferredAt,
            Instant now) {
        Integer conflictingBookings = db.queryForObject("""
                SELECT COUNT(1) FROM dbo.bookings WITH (UPDLOCK, HOLDLOCK)
                WHERE mentor_id=? AND status NOT IN ('CANCELLED','NO_SHOW')
                  AND start_at<? AND end_at>?
                """, Integer.class, mentorId, sqlUtcTimestamp(order.endAt()), sqlUtcTimestamp(order.startAt()));
        Integer conflictingHolds = db.queryForObject("""
                SELECT COUNT(1) FROM dbo.slot_holds WITH (UPDLOCK, HOLDLOCK)
                WHERE mentor_id=? AND id<>? AND status IN ('HELD','CONVERTED')
                  AND (status='CONVERTED' OR expires_at>?)
                  AND start_at<? AND end_at>?
                """, Integer.class, mentorId, order.holdId(), sqlUtcTimestamp(now),
                sqlUtcTimestamp(order.endAt()), sqlUtcTimestamp(order.startAt()));
        if ((conflictingBookings != null && conflictingBookings > 0)
                || (conflictingHolds != null && conflictingHolds > 0)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "The paid time now conflicts with another reservation. Manual reconciliation is required.");
        }
        int converted = db.update("""
                UPDATE dbo.slot_holds SET status='CONVERTED', updated_at=?
                WHERE id=? AND status='HELD' AND expires_at>?
                """, sqlUtcTimestamp(now), order.holdId(), sqlUtcTimestamp(transferredAt));
        if (converted != 1) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "The selected time could not be confirmed. Manual reconciliation is required.");
        }
        BigDecimal bookingPrice = order.unitPrice().multiply(BigDecimal.valueOf(order.participants()));
        for (int index = 0; index < order.sessions(); index++) {
            Instant startAt = order.startAt().plusSeconds((long) index * order.durationMinutes() * 60L);
            Instant endAt = startAt.plusSeconds((long) order.durationMinutes() * 60L);
            var terms = mapper.createObjectNode();
            terms.put("requestId", requestId);
            terms.put("numberOfParticipants", order.participants());
            terms.put("sessionNumber", index + 1);
            terms.put("sessionCount", order.sessions());
            db.update("""
                    INSERT INTO dbo.bookings(
                        booking_code,service_id,mentor_id,mentee_id,service_type,subscription_id,slot_hold_id,
                        booking_type,agenda,start_at,end_at,price_snapshot,currency,terms_snapshot,status,
                        meeting_sync_status,created_at,updated_at)
                    VALUES (?,?,?,?, 'ONE_OFF',NULL,?,'ONE_OFF',?,?,?,?, 'VND',?,'CONFIRMED','PENDING',?,?)
                    """,
                    "ONEOFF-" + requestId + "-" + (index + 1), serviceId, mentorId, menteeId,
                    index == 0 ? order.holdId() : null,
                    agenda,
                    sqlUtcTimestamp(startAt), sqlUtcTimestamp(endAt), bookingPrice,
                    terms.toString(), sqlUtcTimestamp(now), sqlUtcTimestamp(now));
        }
    }

    /**
     * SQL Server DATETIME2 has no timezone. The schema stores UTC wall-clock values, while
     * Timestamp.toInstant()/Timestamp.from() apply the JVM timezone and shift them on hosts
     * running in Asia/Saigon. Keep the conversion explicit at every JDBC boundary.
     */
    static Instant sqlUtcInstant(Timestamp timestamp) {
        return timestamp.toLocalDateTime().toInstant(ZoneOffset.UTC);
    }

    static Timestamp sqlUtcTimestamp(Instant instant) {
        return Timestamp.valueOf(LocalDateTime.ofInstant(instant, ZoneOffset.UTC));
    }

    private record OneOffSettlement(
            long holdId,
            int sessions,
            int participants,
            int durationMinutes,
            BigDecimal unitPrice,
            Instant startAt,
            Instant endAt) {}


    private static long currentMenteeId() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof AuthenticatedUser user && user.id() != null) return user.id();
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please log in to complete payment.");
    }

    private JdbcTemplate db() {
        if (jdbc == null) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Payment service is temporarily unavailable.");
        return jdbc;
    }
}
