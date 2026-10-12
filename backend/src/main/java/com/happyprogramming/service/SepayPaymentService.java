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
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class SepayPaymentService {
    private static final Pattern CODE_PATTERN = Pattern.compile("HP\\d+(?:A\\d+)?", Pattern.CASE_INSENSITIVE);

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
            @Value("${hpms.sepay.api-key:hpms_sepay_secret_2026}") String apiKey,
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
        long menteeId = currentMenteeId();
        JdbcTemplate db = db();
        Map<String, Object> request = loadLockedRequest(db, requestId);
        requireOwnerAndPayable(request, menteeId, requestId);

        Instant now = Instant.now();
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
            Instant expiresAt = ((Timestamp) payment.get("expiresAt")).toInstant();
            if (expiresAt.isAfter(now)) {
                return buildCheckoutResponse(requestId, payment);
            }
            db.update("""
                    UPDATE dbo.payments SET status='EXPIRED', failure_code='CHECKOUT_TIMEOUT',
                        failure_message=N'Payment attempt expired before completion.', updated_at=?
                    WHERE id=? AND status='PENDING'
                    """, Timestamp.from(now), payment.get("id"));
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
        Instant expiresAt = now.plusSeconds(15 * 60L);
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
            ps.setTimestamp(7, Timestamp.from(expiresAt));
            ps.setTimestamp(8, Timestamp.from(now));
            ps.setTimestamp(9, Timestamp.from(now));
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
                "createdAt", Timestamp.from(now),
                "expiresAt", Timestamp.from(expiresAt)));
    }

    private CheckoutResponse buildCheckoutResponse(Long requestId, Map<String, Object> payment) {
        Long paymentId = ((Number) payment.get("id")).longValue();
        String reference = String.valueOf(payment.get("reference"));
        BigDecimal amount = (BigDecimal) payment.get("amount");
        String currency = String.valueOf(payment.get("currency"));
        Instant expiresAt = ((Timestamp) payment.get("expiresAt")).toInstant();
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

        if (payload.transferType() != null && !"in".equalsIgnoreCase(payload.transferType())) {
            return new SepayWebhookResponse(true, "Ignored non-inbound transfer: " + payload.transferType());
        }

        if (payload.accountNumber() != null && !accountNumber.trim().equalsIgnoreCase(payload.accountNumber().trim())) {
            return new SepayWebhookResponse(true, "Ignored: account number mismatch (" + payload.accountNumber() + ")");
        }

        String reference = extractOrderCode(payload);
        if (reference == null || reference.isBlank()) {
            return new SepayWebhookResponse(true, "Ignored: no order reference found in transfer content.");
        }

        JdbcTemplate db = db();
        List<Map<String, Object>> payments = db.query("""
                SELECT id, request_id, amount, currency, status, merchant_reference, gateway_transaction_id,
                       created_at, expires_at
                FROM dbo.payments WITH (UPDLOCK, HOLDLOCK)
                WHERE merchant_reference = ?
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

        String transactionId = payload.referenceCode() != null && !payload.referenceCode().isBlank()
                ? payload.referenceCode()
                : (payload.id() != null ? String.valueOf(payload.id()) : "TXN-" + System.currentTimeMillis());

        String eventKey = "SEPAY:" + transactionId;
        Integer existingEvent = db.queryForObject(
                "SELECT COUNT(1) FROM dbo.payment_events WITH (UPDLOCK, HOLDLOCK) WHERE provider='SEPAY' AND event_key=?",
                Integer.class, eventKey);
        if (existingEvent != null && existingEvent > 0) {
            return new SepayWebhookResponse(true, "Webhook notification already processed.");
        }

        if ("SUCCEEDED".equals(payment.get("status"))) {
            return new SepayWebhookResponse(true, "Payment already completed.");
        }

        Instant now = Instant.now();
        Map<String, Object> request = loadLockedRequest(db, requestId);
        if (!"ACCEPTED".equals(request.get("status")) || request.get("fundedAt") != null) {
            return new SepayWebhookResponse(false, "Application is not eligible for payment settlement.");
        }

        Timestamp paidTimestamp = Timestamp.from(now);
        Timestamp periodEnd = Timestamp.from(now.atZone(ZoneOffset.UTC).plusMonths(1).toInstant());

        db.update("""
                UPDATE dbo.payments SET status='SUCCEEDED', gateway='SEPAY', gateway_transaction_id=?, paid_at=?,
                    billing_period_start=?, billing_period_end=?, updated_at=?
                WHERE id=?
                """, transactionId, paidTimestamp, paidTimestamp, periodEnd, Timestamp.from(now), paymentId);

        db.update("""
                UPDATE dbo.payments SET status='CANCELLED', failure_code='OTHER_ATTEMPT_SUCCEEDED',
                    failure_message=N'Another payment attempt for this application completed.', updated_at=?
                WHERE request_id=? AND id<>? AND status='PENDING'
                """, Timestamp.from(now), requestId, paymentId);

        long menteeId = ((Number) request.get("menteeId")).longValue();
        long mentorId = ((Number) request.get("mentorId")).longValue();
        long serviceId = ((Number) request.get("serviceId")).longValue();

        db.update("""
                INSERT INTO dbo.escrow_ledger_entries(payment_id,entry_type,amount,idempotency_key,created_by,created_at)
                VALUES (?,'HOLD',?,?,?,?)
                """, paymentId, requiredAmount, "ESCROW-HOLD-" + paymentId, menteeId, paidTimestamp);

        db.update("UPDATE dbo.mentorship_requests SET funded_at=?, updated_at=? WHERE id=? AND status='ACCEPTED' AND funded_at IS NULL",
                paidTimestamp, Timestamp.from(now), requestId);

        String offerSnapshot = (String) request.get("offerSnapshot");
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
            ps.setTimestamp(12, Timestamp.from(now));
            ps.setTimestamp(13, Timestamp.from(now));
            return ps;
        }, subscriptionKey);

        db.update("""
                IF NOT EXISTS (SELECT 1 FROM dbo.conversations WITH (UPDLOCK,HOLDLOCK) WHERE mentor_id=? AND mentee_id=?)
                    INSERT INTO dbo.conversations(mentor_id,mentee_id,inquiry_status,created_at,updated_at)
                    VALUES (?,?,'APPROVED',?,?)
                """, mentorId, menteeId, mentorId, menteeId, Timestamp.from(now), Timestamp.from(now));

        insertEvent(db, paymentId, eventKey, payload, "PROCESSED");

        return new SepayWebhookResponse(true, "Payment confirmed and mentorship activated.");
    }

    private void verifyAuth(String authHeader) {
        if (apiKey == null || apiKey.isBlank()) {
            return;
        }
        if (authHeader == null || authHeader.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing authorization header.");
        }
        String token = authHeader.trim();
        if (token.regionMatches(true, 0, "Apikey ", 0, 7)) {
            token = token.substring(7).trim();
        } else if (token.regionMatches(true, 0, "Bearer ", 0, 7)) {
            token = token.substring(7).trim();
        }
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
                SELECT r.id, r.mentee_id, r.mentor_id, r.service_id, r.status, r.funded_at,
                       r.offer_snapshot, r.submitted_at,
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
            result.put("status", rs.getString("status"));
            result.put("fundedAt", rs.getTimestamp("funded_at"));
            result.put("offerSnapshot", rs.getString("offer_snapshot"));
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

    private BigDecimal amountFromSnapshot(Object snapshotValue) {
        if (!(snapshotValue instanceof String snapshot) || snapshot.isBlank())
            throw new ResponseStatusException(HttpStatus.CONFLICT, "The accepted package price is unavailable.");
        try {
            BigDecimal amount = new BigDecimal(mapper.readTree(snapshot).path("price").asText());
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
