package com.happyprogramming.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.happyprogramming.dto.AuthenticatedUser;
import com.happyprogramming.dto.CheckoutResponse;
import com.happyprogramming.dto.VnPayIpnResponse;
import com.happyprogramming.integration.VnPayGateway;
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
import java.math.RoundingMode;
import java.sql.PreparedStatement;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.UUID;

@Service
public class VnPayPaymentService {
    private static final ZoneId VIETNAM = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter PAY_DATE = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
    private final JdbcTemplate jdbc;
    private final VnPayGateway gateway;
    private final ObjectMapper mapper;
    private final String frontendCheckoutUrl;

    public VnPayPaymentService(@Autowired(required = false) JdbcTemplate jdbc, VnPayGateway gateway,
                               ObjectMapper mapper,
                               @Value("${hpms.vnpay.frontend-checkout-url:http://localhost:5173/#/checkout}") String frontendCheckoutUrl) {
        this.jdbc = jdbc;
        this.gateway = gateway;
        this.mapper = mapper;
        this.frontendCheckoutUrl = frontendCheckoutUrl;
    }

    @Transactional
    public CheckoutResponse initiate(Long requestId, String ipAddress) {
        gateway.requireConfigured();
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
                return response(db, requestId, payment, ipAddress);
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
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "VNPay checkout currently supports VND pricing only.");
        }
        BigDecimal commission = db.query("""
                SELECT TRY_CONVERT(DECIMAL(5,2), JSON_VALUE(config_value, '$.value'))
                FROM dbo.system_configs WHERE config_key='finance.commission_rate'
                """, rs -> rs.next() ? rs.getBigDecimal(1) : null);
        if (commission == null || commission.compareTo(BigDecimal.ZERO) < 0 || commission.compareTo(new BigDecimal("100")) > 0) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "The platform commission setting is unavailable. Please try again later.");
        }
        int attemptNo = db.queryForObject("SELECT ISNULL(MAX(attempt_no),0)+1 FROM dbo.payments WITH (UPDLOCK, HOLDLOCK) WHERE request_id=?", Integer.class, requestId);
        Instant expiresAt = now.plusSeconds(15 * 60L);
        // VNPay declares vnp_TxnRef as alphanumeric; avoid separators such as hyphens.
        String reference = "HP" + requestId + "A" + attemptNo + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        String currency = "VND";
        KeyHolder keyHolder = new GeneratedKeyHolder();
        db.update(connection -> {
            PreparedStatement ps = connection.prepareStatement("""
                    INSERT INTO dbo.payments(request_id, billing_cycle_no, attempt_no, gateway, merchant_reference,
                        amount, currency, commission_rate_snapshot, status, expires_at, created_at, updated_at)
                    VALUES (?,1,?,'VNPAY',?,?,?,?,'PENDING',?,?,?)
                    """, new String[]{"id"});
            ps.setLong(1, requestId);
            ps.setInt(2, attemptNo);
            ps.setString(3, reference);
            ps.setBigDecimal(4, amount);
            ps.setString(5, currency);
            ps.setBigDecimal(6, commission);
            ps.setTimestamp(7, Timestamp.from(expiresAt));
            ps.setTimestamp(8, Timestamp.from(now));
            ps.setTimestamp(9, Timestamp.from(now));
            return ps;
        }, keyHolder);
        Number id = keyHolder.getKey();
        if (id == null) throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not create a VNPay payment attempt.");
        return response(db, requestId, Map.of("id", id.longValue(), "reference", reference, "amount", amount,
                "currency", currency, "createdAt", Timestamp.from(now), "expiresAt", Timestamp.from(expiresAt)), ipAddress);
    }

    private CheckoutResponse response(JdbcTemplate db, Long requestId, Map<String, Object> payment, String ipAddress) {
        Instant createdAt = ((Timestamp) payment.get("createdAt")).toInstant();
        Instant expiresAt = ((Timestamp) payment.get("expiresAt")).toInstant();
        BigDecimal amount = (BigDecimal) payment.get("amount");
        long amountVnd;
        try {
            amountVnd = amount.setScale(0, RoundingMode.UNNECESSARY).longValueExact();
        } catch (ArithmeticException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "VNPay only supports whole-VND amounts for this checkout.");
        }
        String paymentUrl = gateway.createPaymentUrl(String.valueOf(payment.get("reference")), amountVnd,
                "HPMS" + String.valueOf(payment.get("reference")).replaceAll("[^A-Za-z0-9]", ""),
                ipAddress, createdAt, expiresAt);
        return new CheckoutResponse(((Number) payment.get("id")).longValue(), requestId, "PENDING",
                amount, String.valueOf(payment.get("currency")), String.valueOf(payment.get("reference")), paymentUrl, expiresAt,
                "VNPay QR payment is ready.");
    }

    @Transactional
    public VnPayIpnResponse processIpn(Map<String, String> parameters) {
        if (!gateway.isValidResponse(parameters)) return new VnPayIpnResponse("97", "Invalid signature");
        String reference = parameters.get("vnp_TxnRef");
        if (reference == null || reference.isBlank()) return new VnPayIpnResponse("01", "Order not found");
        JdbcTemplate db = db();
        var paymentRefs = db.query("""
                SELECT id, request_id FROM dbo.payments WHERE merchant_reference=?
                """, (rs, row) -> Map.of("id", rs.getLong("id"), "requestId", rs.getLong("request_id")), reference);
        if (paymentRefs.isEmpty()) return new VnPayIpnResponse("01", "Order not found");
        long requestId = ((Number) paymentRefs.get(0).get("requestId")).longValue();
        Map<String, Object> request = loadLockedRequest(db, requestId);
        var payments = db.query("""
                SELECT id, request_id, amount, currency, status, merchant_reference, gateway_transaction_id,
                       created_at, expires_at
                FROM dbo.payments WITH (UPDLOCK, HOLDLOCK) WHERE id=?
                """, (rs, row) -> Map.<String, Object>of(
                "id", rs.getLong("id"), "requestId", rs.getLong("request_id"), "amount", rs.getBigDecimal("amount"),
                "currency", rs.getString("currency"), "status", rs.getString("status"),
                "reference", rs.getString("merchant_reference"), "transactionId", rs.getString("gateway_transaction_id") == null ? "" : rs.getString("gateway_transaction_id"),
                "createdAt", rs.getTimestamp("created_at"), "expiresAt", rs.getTimestamp("expires_at")), paymentRefs.get(0).get("id"));
        if (payments.isEmpty()) return new VnPayIpnResponse("01", "Order not found");
        Map<String, Object> payment = payments.get(0);
        if (!reference.equals(payment.get("reference"))) return new VnPayIpnResponse("01", "Order not found");
        if (!"VND".equals(parameters.get("vnp_CurrCode"))
                || !amountMatches((BigDecimal) payment.get("amount"), gateway.getVndAmount(parameters))) {
            return new VnPayIpnResponse("04", "Invalid amount or currency");
        }

        String responseCode = parameters.get("vnp_ResponseCode");
        String transactionStatus = parameters.get("vnp_TransactionStatus");
        boolean success = "00".equals(responseCode) && "00".equals(transactionStatus);
        String transactionId = parameters.getOrDefault("vnp_TransactionNo", "");
        if ("SUCCEEDED".equals(payment.get("status"))) {
            return transactionId.equals(payment.get("transactionId")) || transactionId.isBlank()
                    ? new VnPayIpnResponse("00", "Payment already confirmed")
                    : new VnPayIpnResponse("04", "Payment already completed with another transaction");
        }
        boolean lateSuccessfulCallback = "EXPIRED".equals(payment.get("status")) && success;
        if (!"PENDING".equals(payment.get("status")) && !lateSuccessfulCallback) {
            return ("FAILED".equals(payment.get("status")) || "EXPIRED".equals(payment.get("status")) || "CANCELLED".equals(payment.get("status"))) && !success
                    ? new VnPayIpnResponse("00", "Payment failure already recorded")
                    : new VnPayIpnResponse("04", "Payment attempt is no longer pending");
        }

        Instant now = Instant.now();
        String eventKey = eventKey(reference, transactionId, responseCode, transactionStatus);
        if (db.queryForObject("SELECT COUNT(1) FROM dbo.payment_events WITH (UPDLOCK,HOLDLOCK) WHERE provider='VNPAY' AND event_type='IPN' AND event_key=?", Integer.class, eventKey) > 0) {
            return new VnPayIpnResponse("00", "Notification already processed");
        }

        if (!success) {
            if (!"PENDING".equals(payment.get("status"))) {
                return new VnPayIpnResponse("00", "Payment attempt is already expired");
            }
            db.update("""
                    UPDATE dbo.payments SET status='FAILED', failure_code=?,
                        failure_message=N'VNPay reported an unsuccessful transaction.', updated_at=?
                    WHERE id=? AND status='PENDING'
                    """, safe(parameters.get("vnp_ResponseCode"), 50), Timestamp.from(now), payment.get("id"));
            insertEvent(db, payment, eventKey, parameters, "PROCESSED", null);
            return new VnPayIpnResponse("00", "Payment failure recorded");
        }

        Instant paidAt = parseVnPayDate(parameters.get("vnp_PayDate"));
        Instant createdAt = ((Timestamp) payment.get("createdAt")).toInstant();
        Instant expiresAt = ((Timestamp) payment.get("expiresAt")).toInstant();
        if (transactionId.isBlank() || paidAt == null || paidAt.isBefore(createdAt) || paidAt.isAfter(expiresAt)) {
            return new VnPayIpnResponse("04", "Payment timestamp is outside the checkout window");
        }
        if (!"ACCEPTED".equals(request.get("status")) || request.get("fundedAt") != null) {
            return new VnPayIpnResponse("04", "Application is not eligible for payment");
        }

        long paymentId = ((Number) payment.get("id")).longValue();
        Timestamp paidTimestamp = Timestamp.from(paidAt);
        Timestamp periodEnd = Timestamp.from(paidAt.atZone(ZoneOffset.UTC).plusMonths(1).toInstant());
        db.update("""
                UPDATE dbo.payments SET status='SUCCEEDED', gateway_transaction_id=?, paid_at=?,
                    billing_period_start=?, billing_period_end=?, updated_at=?
                WHERE id=? AND status='PENDING'
                """, safe(transactionId, 100), paidTimestamp, paidTimestamp, periodEnd, Timestamp.from(now), paymentId);
        db.update("""
                UPDATE dbo.payments SET status='CANCELLED', failure_code='OTHER_ATTEMPT_SUCCEEDED',
                    failure_message=N'Another payment attempt for this application completed.', updated_at=?
                WHERE request_id=? AND id<>? AND status='PENDING'
                """, Timestamp.from(now), requestId, paymentId);
        long menteeId = ((Number) request.get("menteeId")).longValue();
        long mentorId = ((Number) request.get("mentorId")).longValue();
        long serviceId = ((Number) request.get("serviceId")).longValue();
        BigDecimal amount = (BigDecimal) payment.get("amount");
        db.update("""
                INSERT INTO dbo.escrow_ledger_entries(payment_id,entry_type,amount,idempotency_key,created_by,created_at)
                VALUES (?,'HOLD',?,?,?,?)
                """, paymentId, amount, "ESCROW-HOLD-" + paymentId, menteeId, paidTimestamp);
        db.update("UPDATE dbo.mentorship_requests SET funded_at=?,updated_at=? WHERE id=? AND status='ACCEPTED' AND funded_at IS NULL",
                paidTimestamp, Timestamp.from(now), requestId);

        KeyHolder subscriptionKey = new GeneratedKeyHolder();
        String offerSnapshot = (String) request.get("offerSnapshot");
        db.update(connection -> {
            PreparedStatement ps = connection.prepareStatement("""
                    INSERT INTO dbo.subscriptions(request_id,service_id,mentor_id,mentee_id,agreed_price,currency,
                        plan_snapshot,status,activated_at,trial_ends_at,current_period_start,current_period_end,
                        next_billing_at,renewal_mode,cancel_at_period_end,created_at,updated_at)
                    VALUES (?,?,?,?,?,'VND',?,'ACTIVE',?,NULL,?,?,?,'MANUAL',0,?,?)
                    """, new String[]{"id"});
            ps.setLong(1, requestId); ps.setLong(2, serviceId); ps.setLong(3, mentorId); ps.setLong(4, menteeId);
            ps.setBigDecimal(5, amount); ps.setString(6, offerSnapshot); ps.setTimestamp(7, paidTimestamp);
            ps.setTimestamp(8, paidTimestamp); ps.setTimestamp(9, periodEnd);
            ps.setTimestamp(10, periodEnd); ps.setTimestamp(11, Timestamp.from(now)); ps.setTimestamp(12, Timestamp.from(now));
            return ps;
        }, subscriptionKey);
        db.update("""
                IF NOT EXISTS (SELECT 1 FROM dbo.conversations WITH (UPDLOCK,HOLDLOCK) WHERE mentor_id=? AND mentee_id=?)
                    INSERT INTO dbo.conversations(mentor_id,mentee_id,inquiry_status,created_at,updated_at)
                    VALUES (?,?,'APPROVED',?,?)
                """, mentorId, menteeId, mentorId, menteeId, Timestamp.from(now), Timestamp.from(now));
        insertEvent(db, payment, eventKey, parameters, "PROCESSED", paymentId);
        return new VnPayIpnResponse("00", "Payment confirmed");
    }

    @Transactional(readOnly = true)
    public Long resolveReturnRequestId(Map<String, String> parameters) {
        if (!gateway.isValidResponse(parameters)) return null;
        String reference = parameters.get("vnp_TxnRef");
        if (reference == null || reference.isBlank()) return null;
        try {
            return db().queryForObject("SELECT request_id FROM dbo.payments WHERE merchant_reference=?", Long.class, reference);
        } catch (RuntimeException ex) {
            return null;
        }
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
            result.put("id", rs.getLong("id")); result.put("menteeId", rs.getLong("mentee_id"));
            result.put("mentorId", rs.getLong("mentor_id")); result.put("serviceId", rs.getLong("service_id"));
            result.put("status", rs.getString("status")); result.put("fundedAt", rs.getTimestamp("funded_at"));
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

    static String recoverLegacyOfferSnapshot(com.fasterxml.jackson.databind.ObjectMapper mapper,
                                              Map<String, Object> request) {
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

    static boolean isOfferingUnchangedSinceRequest(Timestamp submittedAt, Timestamp offeringUpdatedAt) {
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
        try { return mapper.readTree(String.valueOf(snapshotValue)).path("currency").asText("VND"); }
        catch (Exception ex) { throw new ResponseStatusException(HttpStatus.CONFLICT, "The accepted package currency is invalid."); }
    }

    private void insertEvent(JdbcTemplate db, Map<String, Object> payment, String key,
                             Map<String, String> fields, String status, Long paymentId) {
        String payload;
        try { payload = mapper.writeValueAsString(fields); }
        catch (JsonProcessingException ex) { payload = "{}"; }
        db.update("""
                INSERT INTO dbo.payment_events(payment_id,provider,event_type,event_key,payload,signature_valid,processing_status,received_at,processed_at)
                VALUES (?,'VNPAY','IPN',?,?,1,?,?,SYSUTCDATETIME())
                """, paymentId != null ? paymentId : payment.get("id"), key, payload, status, Timestamp.from(Instant.now()));
    }

    private static String eventKey(String reference, String transactionId, String response, String transactionStatus) {
        String key = reference + ":" + transactionId + ":" + response + ":" + transactionStatus;
        return key.length() > 200 ? key.substring(0, 200) : key;
    }

    private static boolean amountMatches(BigDecimal amount, long gatewayMinor) {
        if (gatewayMinor < 0) return false;
        try { return amount.movePointRight(2).setScale(0, RoundingMode.UNNECESSARY).longValueExact() == gatewayMinor; }
        catch (ArithmeticException ex) { return false; }
    }

    private static Instant parseVnPayDate(String value) {
        if (value == null) return null;
        try { return LocalDateTime.parse(value, PAY_DATE).atZone(VIETNAM).toInstant(); }
        catch (RuntimeException ex) { return null; }
    }

    private static String safe(String value, int max) {
        if (value == null) return "UNKNOWN";
        String clean = value.replaceAll("[^A-Za-z0-9_-]", "");
        return clean.isBlank() ? "UNKNOWN" : clean.substring(0, Math.min(clean.length(), max));
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
