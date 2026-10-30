package com.happyprogramming.service;

import com.happyprogramming.dto.AdminRefundRequest;
import com.happyprogramming.dto.AuthenticatedUser;
import com.happyprogramming.dto.DisputeDtos;
import com.happyprogramming.dto.DisputeFileDownload;
import com.happyprogramming.dto.RefundDecisionRequest;
import com.happyprogramming.dto.StaffDisputeDtos;
import com.happyprogramming.repository.AdminRepository;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.sql.PreparedStatement;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
public class DisputeService {
    private static final Set<String> TARGET_TYPES = Set.of("ONE_OFF", "MONTHLY");
    private static final Set<String> CATEGORIES = Set.of(
            "NO_SHOW", "QUALITY_MISMATCH", "UNRESPONSIVE", "CONDUCT_VIOLATION", "TECHNICAL_FAILURE", "OTHER");
    private static final Set<String> ACTIVE_STATUSES = Set.of("SUBMITTED", "IN_MEDIATION", "AWAITING_EVIDENCE");
    private static final int MAX_FILES = 5;
    private static final long MAX_FILE_SIZE = 5L * 1024 * 1024;

    private final JdbcTemplate jdbc;
    private final AdminRepository adminRepository;
    private final EmailService emailService;

    public DisputeService(JdbcTemplate jdbc) {
        this(jdbc, null, null);
    }

    @Autowired
    public DisputeService(JdbcTemplate jdbc, AdminRepository adminRepository, @Autowired(required = false) EmailService emailService) {
        this.jdbc = jdbc;
        this.adminRepository = adminRepository;
        this.emailService = emailService;
    }

    @Transactional(readOnly = true)
    public List<DisputeDtos.EligibleTarget> eligibleTargets() {
        long menteeId = requireMentee();
        return jdbc.query("""
                SELECT target_type,target_id,title,mentor_name,scheduled_at,amount,currency
                FROM (
                  SELECT 'ONE_OFF' target_type,b.id target_id,
                         COALESCE(o.name,N'One-off session') title,u.full_name mentor_name,
                         b.start_at scheduled_at,p.amount,p.currency
                  FROM dbo.bookings b
                  JOIN dbo.users u ON u.id=b.mentor_id
                  LEFT JOIN dbo.service_offerings o ON o.id=b.service_id
                  JOIN dbo.payments p ON p.request_id=TRY_CONVERT(BIGINT,JSON_VALUE(b.terms_snapshot,'$.requestId'))
                                     AND p.status='SUCCEEDED'
                  WHERE b.mentee_id=? AND b.service_type='ONE_OFF'
                    AND b.status IN ('CONFIRMED','COMPLETED')
                    AND b.start_at<=SYSUTCDATETIME() AND SYSUTCDATETIME()<=DATEADD(HOUR,48,b.end_at)
                    AND NOT EXISTS (SELECT 1 FROM dbo.disputes d WHERE d.booking_id=b.id
                                    AND d.status IN ('SUBMITTED','IN_MEDIATION','AWAITING_EVIDENCE','APPROVED'))
                  UNION ALL
                  SELECT 'MONTHLY',s.id,
                         COALESCE(JSON_VALUE(s.plan_snapshot,'$.name'),N'Monthly mentorship'),u.full_name,
                         s.activated_at,p.amount,p.currency
                  FROM dbo.subscriptions s
                  JOIN dbo.users u ON u.id=s.mentor_id
                  JOIN dbo.payments p ON p.request_id=s.request_id AND p.status='SUCCEEDED'
                  WHERE s.mentee_id=? AND s.status='TRIALING'
                    AND SYSUTCDATETIME()<=s.trial_ends_at
                    AND NOT EXISTS (SELECT 1 FROM dbo.disputes d WHERE d.subscription_id=s.id
                                    AND d.status IN ('SUBMITTED','IN_MEDIATION','AWAITING_EVIDENCE','APPROVED'))
                ) targets ORDER BY scheduled_at DESC,target_id DESC
                """, (rs, row) -> new DisputeDtos.EligibleTarget(
                rs.getString("target_type"), rs.getLong("target_id"), rs.getString("title"),
                rs.getString("mentor_name"), instant(rs.getTimestamp("scheduled_at")),
                rs.getBigDecimal("amount"), rs.getString("currency")), menteeId, menteeId);
    }

    @Transactional(readOnly = true)
    public DisputeDtos.EligibleTarget targetByRequestId(long requestId) {
        long menteeId = requireMentee();
        List<DisputeDtos.EligibleTarget> targets = jdbc.query("""
                SELECT target_type,target_id,title,mentor_name,scheduled_at,amount,currency
                FROM (
                  SELECT 'ONE_OFF' target_type,b.id target_id,
                         COALESCE(o.name,N'One-off session') title,u.full_name mentor_name,
                         b.start_at scheduled_at,p.amount,p.currency
                  FROM dbo.bookings b
                  JOIN dbo.users u ON u.id=b.mentor_id
                  LEFT JOIN dbo.service_offerings o ON o.id=b.service_id
                  JOIN dbo.payments p ON p.request_id=TRY_CONVERT(BIGINT,JSON_VALUE(b.terms_snapshot,'$.requestId'))
                                     AND p.status='SUCCEEDED'
                  WHERE b.mentee_id=? AND b.service_type='ONE_OFF'
                    AND b.status IN ('CONFIRMED','COMPLETED')
                    AND b.start_at<=SYSUTCDATETIME() AND SYSUTCDATETIME()<=DATEADD(HOUR,48,b.end_at)
                    AND TRY_CONVERT(BIGINT,JSON_VALUE(b.terms_snapshot,'$.requestId'))=?
                    AND NOT EXISTS (SELECT 1 FROM dbo.disputes d WHERE d.booking_id=b.id
                                    AND d.status IN ('SUBMITTED','IN_MEDIATION','AWAITING_EVIDENCE','APPROVED'))
                  UNION ALL
                  SELECT 'MONTHLY',s.id,
                         COALESCE(JSON_VALUE(s.plan_snapshot,'$.name'),N'Monthly mentorship'),u.full_name,
                         s.activated_at,p.amount,p.currency
                  FROM dbo.subscriptions s
                  JOIN dbo.users u ON u.id=s.mentor_id
                  JOIN dbo.payments p ON p.request_id=s.request_id AND p.status='SUCCEEDED'
                  WHERE s.mentee_id=? AND s.status='TRIALING'
                    AND SYSUTCDATETIME()<=s.trial_ends_at
                    AND s.request_id=?
                    AND NOT EXISTS (SELECT 1 FROM dbo.disputes d WHERE d.subscription_id=s.id
                                    AND d.status IN ('SUBMITTED','IN_MEDIATION','AWAITING_EVIDENCE','APPROVED'))
                ) targets
                """, (rs, row) -> new DisputeDtos.EligibleTarget(
                rs.getString("target_type"), rs.getLong("target_id"), rs.getString("title"),
                rs.getString("mentor_name"), instant(rs.getTimestamp("scheduled_at")),
                rs.getBigDecimal("amount"), rs.getString("currency")), menteeId, requestId, menteeId, requestId);
        if (targets.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No eligible target found for request.");
        return targets.get(0);
    }

    @Transactional
    public DisputeDtos.Detail submit(String targetType, long targetId, String category,
                                     String description, boolean termsAccepted,
                                     List<MultipartFile> evidenceFiles) {
        return submit(targetType, targetId, null, category, description, termsAccepted, evidenceFiles, null, null, null);
    }

    @Transactional
    public DisputeDtos.Detail submit(String targetType, Long targetId, Long requestId, String category,
                                     String description, boolean termsAccepted,
                                     List<MultipartFile> evidenceFiles) {
        return submit(targetType, targetId, requestId, category, description, termsAccepted, evidenceFiles, null, null, null);
    }

    @Transactional
    public DisputeDtos.Detail submit(String targetType, Long targetId, Long requestId, String category,
                                     String description, boolean termsAccepted,
                                     List<MultipartFile> evidenceFiles,
                                     String bankName, String accountNumber, String accountName) {
        long resolvedId = targetId != null ? targetId : 0L;
        String resolvedType = targetType;
        if ((targetType == null || targetId == null || targetId <= 0) && requestId != null) {
            DisputeDtos.EligibleTarget found = targetByRequestId(requestId);
            resolvedType = found.targetType();
            resolvedId = found.targetId();
        }
        final long finalTargetId = resolvedId;
        final String finalType = normalize(resolvedType);
        long menteeId = requireMentee();
        String normalizedCategory = normalize(category);
        String body = description == null ? "" : description.trim();
        if (!TARGET_TYPES.contains(finalType)) throw badRequest("Select a valid service type.");
        if (!CATEGORIES.contains(normalizedCategory)) throw badRequest("Select a valid dispute category.");
        if (body.length() < 30 || body.length() > 2000)
            throw badRequest("Description must contain between 30 and 2,000 characters.");
        if (!termsAccepted) throw badRequest("Confirm that the complaint and evidence are authentic.");
        if (evidenceFiles == null || evidenceFiles.isEmpty() || evidenceFiles.size() > MAX_FILES)
            throw badRequest("Attach between 1 and 5 image files.");
        if ("ONE_OFF".equals(finalType) && "UNRESPONSIVE".equals(normalizedCategory))
            throw badRequest("Unresponsive mentor disputes apply to monthly mentorships.");
        if ("MONTHLY".equals(finalType) && "NO_SHOW".equals(normalizedCategory))
            throw badRequest("No-show disputes apply to scheduled one-off sessions.");
        List<ValidatedFile> files = evidenceFiles.stream().map(this::validateImage).toList();

        Target target = lockTarget(finalType, finalTargetId);
        if (target == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking or mentorship was not found.");
        if (target.menteeId() != menteeId)
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only dispute your own booking or mentorship.");
        validateEligibility(target);
        Integer duplicate = jdbc.queryForObject("""
                SELECT COUNT(1) FROM dbo.disputes
                WHERE ((?='ONE_OFF' AND booking_id=?) OR (?='MONTHLY' AND subscription_id=?))
                  AND status IN ('SUBMITTED','IN_MEDIATION','AWAITING_EVIDENCE','APPROVED')
                """, Integer.class, finalType, finalTargetId, finalType, finalTargetId);
        if (duplicate != null && duplicate > 0)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "An active dispute already exists for this service.");

        String ticket = "HP-DSP-" + DateTimeFormatter.ofPattern("yyyyMM").withZone(ZoneOffset.UTC).format(Instant.now())
                + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT);
        KeyHolder keys = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            PreparedStatement ps = connection.prepareStatement("""
                    INSERT INTO dbo.disputes(ticket_code,complainant_id,respondent_id,booking_id,subscription_id,
                        payment_id,target_type,previous_target_status,category,description,disputed_amount,currency,
                        status,terms_accepted_at,bank_name,account_number,account_name,created_at,updated_at)
                    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'SUBMITTED',SYSUTCDATETIME(),?,?,?,SYSUTCDATETIME(),SYSUTCDATETIME())
                    """, new String[] {"id"});
            ps.setString(1, ticket); ps.setLong(2, menteeId); ps.setLong(3, target.mentorId());
            if ("ONE_OFF".equals(finalType)) { ps.setLong(4, finalTargetId); ps.setNull(5, java.sql.Types.BIGINT); }
            else { ps.setNull(4, java.sql.Types.BIGINT); ps.setLong(5, finalTargetId); }
            ps.setLong(6, target.paymentId()); ps.setString(7, finalType); ps.setString(8, target.status());
            ps.setString(9, normalizedCategory); ps.setString(10, body);
            ps.setBigDecimal(11, target.amount()); ps.setString(12, target.currency());
            ps.setString(13, bankName); ps.setString(14, accountNumber); ps.setString(15, accountName);
            return ps;
        }, keys);
        Number createdId = keys.getKey();
        if (createdId == null) throw new IllegalStateException("Dispute could not be created.");
        long disputeId = createdId.longValue();
        for (int i = 0; i < files.size(); i++) storeEvidence(disputeId, menteeId, i + 1, files.get(i));
        int changed = jdbc.update("UPDATE dbo." + ("ONE_OFF".equals(finalType) ? "bookings" : "subscriptions")
                + " SET status='DISPUTED',updated_at=SYSUTCDATETIME() WHERE id=? AND status=?", finalTargetId, target.status());
        if (changed != 1) throw new ResponseStatusException(HttpStatus.CONFLICT, "The service changed while the dispute was being submitted.");
        return detail(disputeId);
    }

    @Transactional(readOnly = true)
    public List<DisputeDtos.Summary> mine() {
        long menteeId = requireMentee();
        return jdbc.query(summarySql() + " WHERE d.complainant_id=? ORDER BY d.created_at DESC", (rs, row) -> summary(rs), menteeId);
    }

    @Transactional(readOnly = true)
    public DisputeDtos.Detail detail(long disputeId) {
        long menteeId = requireMentee();
        List<DisputeDtos.Detail> rows = jdbc.query("""
                SELECT d.id,d.ticket_code,d.target_type,COALESCE(d.booking_id,d.subscription_id) target_id,
                       COALESCE(o.name,JSON_VALUE(s.plan_snapshot,'$.name'),N'Mentorship') title,
                       mentor.full_name mentor_name,COALESCE(b.start_at,s.activated_at) scheduled_at,
                       d.disputed_amount,d.currency,d.category,d.description,d.status,d.created_at,
                       d.resolution_type,d.resolution_note,d.refund_amount,d.resolved_at,
                       d.transfer_reference,d.bank_name,d.account_number,d.account_name,d.approved_at
                FROM dbo.disputes d
                JOIN dbo.users mentor ON mentor.id=d.respondent_id
                LEFT JOIN dbo.bookings b ON b.id=d.booking_id
                LEFT JOIN dbo.service_offerings o ON o.id=b.service_id
                LEFT JOIN dbo.subscriptions s ON s.id=d.subscription_id
                WHERE d.id=? AND d.complainant_id=?
                """, (rs, row) -> new DisputeDtos.Detail(
                rs.getLong("id"), rs.getString("ticket_code"), rs.getString("target_type"), rs.getLong("target_id"),
                rs.getString("title"), rs.getString("mentor_name"), instant(rs.getTimestamp("scheduled_at")),
                rs.getBigDecimal("disputed_amount"), rs.getString("currency"), rs.getString("category"),
                rs.getString("description"), rs.getString("status"), instant(rs.getTimestamp("created_at")),
                rs.getString("resolution_type"), rs.getString("resolution_note"), rs.getBigDecimal("refund_amount"),
                instant(rs.getTimestamp("resolved_at")), List.of(),
                rs.getString("transfer_reference"), rs.getString("bank_name"), rs.getString("account_number"),
                rs.getString("account_name"), instant(rs.getTimestamp("approved_at"))), disputeId, menteeId);
        if (!rows.isEmpty()) {
            DisputeDtos.Detail item = rows.get(0);
            return new DisputeDtos.Detail(item.id(), item.ticketCode(), item.targetType(), item.targetId(),
                    item.title(), item.mentorName(), item.scheduledAt(), item.disputedAmount(), item.currency(),
                    item.category(), item.description(), item.status(), item.createdAt(), item.resolutionType(),
                    item.resolutionNote(), item.refundAmount(), item.resolvedAt(), evidence(disputeId, menteeId),
                    item.transferReference(), item.bankName(), item.accountNumber(), item.accountName(), item.approvedAt());
        }
        Integer exists = jdbc.queryForObject("SELECT COUNT(1) FROM dbo.disputes WHERE id=?", Integer.class, disputeId);
        if (exists != null && exists > 0) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You cannot access this dispute.");
        throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Dispute was not found.");
    }

    @Transactional(readOnly = true)
    public DisputeFileDownload download(long disputeId, long evidenceId) {
        long menteeId = requireMentee();
        List<DisputeFileDownload> rows = jdbc.query("""
                SELECT f.original_name,f.mime_type,f.size_bytes,f.file_content
                FROM dbo.dispute_evidence e JOIN dbo.disputes d ON d.id=e.dispute_id
                JOIN dbo.files f ON f.id=e.file_id
                WHERE e.id=? AND e.dispute_id=? AND d.complainant_id=? AND f.status='READY'
                """, (rs, row) -> new DisputeFileDownload(rs.getString("original_name"), rs.getString("mime_type"),
                rs.getLong("size_bytes"), rs.getBytes("file_content")), evidenceId, disputeId, menteeId);
        if (rows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Evidence file was not found.");
        return rows.get(0);
    }

    private Target lockTarget(String type, long id) {
        String sql = "ONE_OFF".equals(type) ? """
                SELECT b.id,b.mentee_id,b.mentor_id,b.status,b.start_at,b.end_at,
                       p.id payment_id,p.amount,p.currency
                FROM dbo.bookings b WITH (UPDLOCK,HOLDLOCK)
                LEFT JOIN dbo.payments p ON p.request_id=TRY_CONVERT(BIGINT,JSON_VALUE(b.terms_snapshot,'$.requestId')) AND p.status='SUCCEEDED'
                WHERE b.id=? AND b.service_type='ONE_OFF'
                """ : """
                SELECT s.id,s.mentee_id,s.mentor_id,s.status,s.activated_at start_at,s.trial_ends_at end_at,
                       p.id payment_id,p.amount,p.currency
                FROM dbo.subscriptions s WITH (UPDLOCK,HOLDLOCK)
                LEFT JOIN dbo.payments p ON p.request_id=s.request_id AND p.status='SUCCEEDED'
                WHERE s.id=?
                """;
        List<Target> rows = jdbc.query(sql, (rs, row) -> new Target(
                rs.getLong("id"), rs.getLong("mentee_id"), rs.getLong("mentor_id"), rs.getString("status"),
                instant(rs.getTimestamp("start_at")), instant(rs.getTimestamp("end_at")),
                rs.getObject("payment_id") == null ? null : rs.getLong("payment_id"),
                rs.getBigDecimal("amount"), rs.getString("currency"), type), id);
        return rows.isEmpty() ? null : rows.get(0);
    }

    private void validateEligibility(Target target) {
        Instant now = Instant.now();
        if (target.paymentId() == null) throw new ResponseStatusException(HttpStatus.CONFLICT, "Only paid services can be disputed.");
        if ("ONE_OFF".equals(target.type())) {
            if (!Set.of("CONFIRMED", "COMPLETED").contains(target.status()) || target.startAt() == null || now.isBefore(target.startAt())
                    || target.endAt() == null || now.isAfter(target.endAt().plusSeconds(48 * 3600L)))
                throw new ResponseStatusException(HttpStatus.CONFLICT, "This session is outside the 48-hour dispute window.");
        } else if (!"TRIALING".equals(target.status()) || target.endAt() == null || now.isAfter(target.endAt())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Monthly disputes must be filed during the 7-day trial window.");
        }
    }

    private void storeEvidence(long disputeId, long userId, int order, ValidatedFile file) {
        KeyHolder keys = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            PreparedStatement ps = connection.prepareStatement("""
                    INSERT INTO dbo.files(uploaded_by,original_name,storage_key,mime_type,size_bytes,checksum,
                        file_content,visibility,status,created_at,updated_at)
                    VALUES (?,?,?,?,?,?,?,'AUTHORIZED','READY',SYSUTCDATETIME(),SYSUTCDATETIME())
                    """, new String[] {"id"});
            ps.setLong(1, userId); ps.setString(2, file.name());
            ps.setString(3, "disputes/" + disputeId + "/" + UUID.randomUUID());
            ps.setString(4, file.mime()); ps.setLong(5, file.bytes().length); ps.setString(6, file.checksum()); ps.setBytes(7, file.bytes());
            return ps;
        }, keys);
        Number fileId = keys.getKey();
        if (fileId == null) throw new IllegalStateException("Evidence file could not be stored.");
        jdbc.update("INSERT INTO dbo.dispute_evidence(dispute_id,file_id,uploaded_by,display_order,created_at) VALUES (?,?,?,?,SYSUTCDATETIME())",
                disputeId, fileId.longValue(), userId, order);
    }

    private ValidatedFile validateImage(MultipartFile upload) {
        try {
            if (upload == null || upload.isEmpty()) throw badRequest("Evidence images cannot be empty.");
            if (upload.getSize() > MAX_FILE_SIZE) throw badRequest("Each evidence image must be 5 MB or smaller.");
            String name = upload.getOriginalFilename() == null ? "evidence" : upload.getOriginalFilename().replace('\\', '/');
            name = name.substring(name.lastIndexOf('/') + 1);
            String lower = name.toLowerCase(Locale.ROOT);
            byte[] bytes = upload.getBytes();
            String mime;
            if (isPng(bytes) && lower.endsWith(".png")) mime = "image/png";
            else if (isJpeg(bytes) && (lower.endsWith(".jpg") || lower.endsWith(".jpeg"))) mime = "image/jpeg";
            else if (isWebp(bytes) && lower.endsWith(".webp")) mime = "image/webp";
            else throw badRequest("Evidence must be a valid PNG, JPG, JPEG, or WEBP image.");
            String checksum = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
            return new ValidatedFile(name, mime, bytes, checksum);
        } catch (ResponseStatusException ex) { throw ex; }
        catch (Exception ex) { throw badRequest("Evidence image could not be read."); }
    }

    private List<DisputeDtos.Evidence> evidence(long disputeId, long menteeId) {
        return jdbc.query("""
                SELECT e.id,f.original_name,f.mime_type,f.size_bytes,e.created_at
                FROM dbo.dispute_evidence e JOIN dbo.disputes d ON d.id=e.dispute_id
                JOIN dbo.files f ON f.id=e.file_id
                WHERE e.dispute_id=? AND d.complainant_id=? ORDER BY e.display_order
                """, (rs, row) -> new DisputeDtos.Evidence(rs.getLong("id"), rs.getString("original_name"),
                rs.getString("mime_type"), rs.getLong("size_bytes"), instant(rs.getTimestamp("created_at"))), disputeId, menteeId);
    }

    private String summarySql() { return """
            SELECT d.id,d.ticket_code,d.target_type,COALESCE(d.booking_id,d.subscription_id) target_id,
                   COALESCE(o.name,JSON_VALUE(s.plan_snapshot,'$.name'),N'Mentorship') title,
                   mentor.full_name mentor_name,COALESCE(b.start_at,s.activated_at) scheduled_at,
                   d.disputed_amount,d.currency,d.category,d.status,d.created_at
            FROM dbo.disputes d JOIN dbo.users mentor ON mentor.id=d.respondent_id
            LEFT JOIN dbo.bookings b ON b.id=d.booking_id
            LEFT JOIN dbo.service_offerings o ON o.id=b.service_id
            LEFT JOIN dbo.subscriptions s ON s.id=d.subscription_id
            """; }

    private DisputeDtos.Summary summary(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new DisputeDtos.Summary(rs.getLong("id"), rs.getString("ticket_code"), rs.getString("target_type"),
                rs.getLong("target_id"), rs.getString("title"), rs.getString("mentor_name"),
                instant(rs.getTimestamp("scheduled_at")), rs.getBigDecimal("disputed_amount"), rs.getString("currency"),
                rs.getString("category"), rs.getString("status"), instant(rs.getTimestamp("created_at")));
    }

    private long requireMentee() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof AuthenticatedUser user) || user.id() == null)
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please log in to manage disputes.");
        if (user.roles() == null || !user.roles().contains("MENTEE"))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only mentees can manage disputes.");
        return user.id();
    }

    private static String normalize(String value) { return value == null ? "" : value.trim().toUpperCase(Locale.ROOT); }
    private static ResponseStatusException badRequest(String message) { return new ResponseStatusException(HttpStatus.BAD_REQUEST, message); }
    private static Instant instant(Timestamp value) { return value == null ? null : value.toLocalDateTime().toInstant(ZoneOffset.UTC); }
    private static boolean isPng(byte[] b) { return b.length >= 8 && b[0]==(byte)0x89 && b[1]==0x50 && b[2]==0x4e && b[3]==0x47 && b[4]==0x0d && b[5]==0x0a && b[6]==0x1a && b[7]==0x0a; }
    private static boolean isJpeg(byte[] b) { return b.length >= 3 && b[0]==(byte)0xff && b[1]==(byte)0xd8 && b[2]==(byte)0xff; }
    private static boolean isWebp(byte[] b) { return b.length >= 12 && new String(b,0,4, StandardCharsets.US_ASCII).equals("RIFF") && new String(b,8,4,StandardCharsets.US_ASCII).equals("WEBP"); }

    @Transactional(readOnly = true)
    public List<StaffDisputeDtos.StaffSummary> staffListDisputes() {
        return jdbc.query("""
                SELECT d.id, d.ticket_code, d.target_type, COALESCE(d.booking_id, d.subscription_id) target_id,
                       COALESCE(o.name, JSON_VALUE(s.plan_snapshot, '$.name'), N'Mentorship') title,
                       c.full_name complainant_name, c.email complainant_email,
                       m.full_name respondent_name, m.email respondent_email,
                       COALESCE(b.start_at, s.activated_at) scheduled_at,
                       d.disputed_amount, d.currency, d.category, d.status, d.created_at,
                       d.assigned_staff_id, st.full_name assigned_staff_name
                FROM dbo.disputes d
                JOIN dbo.users c ON c.id = d.complainant_id
                JOIN dbo.users m ON m.id = d.respondent_id
                LEFT JOIN dbo.users st ON st.id = d.assigned_staff_id
                LEFT JOIN dbo.bookings b ON b.id = d.booking_id
                LEFT JOIN dbo.service_offerings o ON o.id = b.service_id
                LEFT JOIN dbo.subscriptions s ON s.id = d.subscription_id
                ORDER BY d.created_at DESC, d.id DESC
                """, (rs, row) -> new StaffDisputeDtos.StaffSummary(
                rs.getLong("id"), rs.getString("ticket_code"), rs.getString("target_type"),
                rs.getLong("target_id"), rs.getString("title"),
                rs.getString("complainant_name"), rs.getString("complainant_email"),
                rs.getString("respondent_name"), rs.getString("respondent_email"),
                instant(rs.getTimestamp("scheduled_at")),
                rs.getBigDecimal("disputed_amount"), rs.getString("currency"),
                rs.getString("category"), rs.getString("status"),
                instant(rs.getTimestamp("created_at")),
                rs.getObject("assigned_staff_id") != null ? rs.getLong("assigned_staff_id") : null,
                rs.getString("assigned_staff_name")
        ));
    }

    @Transactional(readOnly = true)
    public StaffDisputeDtos.StaffDetail staffDisputeDetail(long disputeId) {
        List<StaffDisputeDtos.StaffDetail> rows = jdbc.query("""
                SELECT d.id, d.ticket_code, d.target_type, COALESCE(d.booking_id, d.subscription_id) target_id,
                       COALESCE(o.name, JSON_VALUE(s.plan_snapshot, '$.name'), N'Mentorship') title,
                       d.complainant_id, c.full_name complainant_name, c.email complainant_email,
                       d.respondent_id, m.full_name respondent_name, m.email respondent_email,
                       COALESCE(b.start_at, s.activated_at) scheduled_at,
                       d.disputed_amount, d.currency, d.category, d.description, d.status,
                       d.created_at, d.terms_accepted_at, d.assigned_staff_id, st.full_name assigned_staff_name,
                       d.response_deadline_at, d.resolution_type, d.resolution_note, d.refund_amount, d.resolved_at,
                       d.bank_name, d.account_number, d.account_name, d.approved_by, ap.full_name approved_by_name,
                       d.approved_at, d.transfer_reference
                FROM dbo.disputes d
                JOIN dbo.users c ON c.id = d.complainant_id
                JOIN dbo.users m ON m.id = d.respondent_id
                LEFT JOIN dbo.users st ON st.id = d.assigned_staff_id
                LEFT JOIN dbo.users ap ON ap.id = d.approved_by
                LEFT JOIN dbo.bookings b ON b.id = d.booking_id
                LEFT JOIN dbo.service_offerings o ON o.id = b.service_id
                LEFT JOIN dbo.subscriptions s ON s.id = d.subscription_id
                WHERE d.id = ?
                """, (rs, row) -> new StaffDisputeDtos.StaffDetail(
                rs.getLong("id"), rs.getString("ticket_code"), rs.getString("target_type"),
                rs.getLong("target_id"), rs.getString("title"),
                rs.getLong("complainant_id"), rs.getString("complainant_name"), rs.getString("complainant_email"),
                rs.getLong("respondent_id"), rs.getString("respondent_name"), rs.getString("respondent_email"),
                instant(rs.getTimestamp("scheduled_at")),
                rs.getBigDecimal("disputed_amount"), rs.getString("currency"),
                rs.getString("category"), rs.getString("description"), rs.getString("status"),
                instant(rs.getTimestamp("created_at")), instant(rs.getTimestamp("terms_accepted_at")),
                rs.getObject("assigned_staff_id") != null ? rs.getLong("assigned_staff_id") : null,
                rs.getString("assigned_staff_name"),
                instant(rs.getTimestamp("response_deadline_at")),
                rs.getString("resolution_type"), rs.getString("resolution_note"),
                rs.getBigDecimal("refund_amount"), instant(rs.getTimestamp("resolved_at")),
                List.of(),
                rs.getString("bank_name"), rs.getString("account_number"), rs.getString("account_name"),
                rs.getObject("approved_by") != null ? rs.getLong("approved_by") : null,
                rs.getString("approved_by_name"), instant(rs.getTimestamp("approved_at")),
                rs.getString("transfer_reference")
        ), disputeId);
        if (rows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Dispute was not found.");
        StaffDisputeDtos.StaffDetail item = rows.get(0);
        List<DisputeDtos.Evidence> evList = jdbc.query("""
                SELECT e.id, f.original_name, f.mime_type, f.size_bytes, e.created_at
                FROM dbo.dispute_evidence e
                JOIN dbo.files f ON f.id = e.file_id
                WHERE e.dispute_id = ?
                ORDER BY e.display_order
                """, (rs, row) -> new DisputeDtos.Evidence(
                rs.getLong("id"), rs.getString("original_name"),
                rs.getString("mime_type"), rs.getLong("size_bytes"),
                instant(rs.getTimestamp("created_at"))
        ), disputeId);
        return new StaffDisputeDtos.StaffDetail(
                item.id(), item.ticketCode(), item.targetType(), item.targetId(), item.title(),
                item.complainantId(), item.complainantName(), item.complainantEmail(),
                item.respondentId(), item.respondentName(), item.respondentEmail(),
                item.scheduledAt(), item.disputedAmount(), item.currency(), item.category(),
                item.description(), item.status(), item.createdAt(), item.termsAcceptedAt(),
                item.assignedStaffId(), item.assignedStaffName(), item.responseDeadlineAt(),
                item.resolutionType(), item.resolutionNote(), item.refundAmount(), item.resolvedAt(),
                evList,
                item.bankName(), item.accountNumber(), item.accountName(),
                item.approvedBy(), item.approvedByName(), item.approvedAt(),
                item.transferReference()
        );
    }

    @Transactional(readOnly = true)
    public DisputeFileDownload staffDownloadEvidence(long disputeId, long evidenceId) {
        List<DisputeFileDownload> rows = jdbc.query("""
                SELECT f.original_name, f.mime_type, f.size_bytes, f.file_content
                FROM dbo.dispute_evidence e
                JOIN dbo.files f ON f.id = e.file_id
                WHERE e.id = ? AND e.dispute_id = ? AND f.status = 'READY'
                """, (rs, row) -> new DisputeFileDownload(
                rs.getString("original_name"), rs.getString("mime_type"),
                rs.getLong("size_bytes"), rs.getBytes("file_content")
        ), evidenceId, disputeId);
        if (rows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Evidence file was not found.");
        return rows.get(0);
    }

    @Transactional
    public StaffDisputeDtos.StaffDetail staffIntake(long disputeId, AuthenticatedUser staffUser) {
        long staffId = staffUser != null && staffUser.id() != null ? staffUser.id() : 1L;
        String staffName = staffUser != null && staffUser.name() != null ? staffUser.name() : "Operational Staff";
        int updated = jdbc.update("""
                UPDATE dbo.disputes
                SET status = 'IN_MEDIATION', assigned_staff_id = ?,
                    response_deadline_at = DATEADD(HOUR, 24, SYSUTCDATETIME()),
                    updated_at = SYSUTCDATETIME()
                WHERE id = ? AND status = 'SUBMITTED'
                """, staffId, disputeId);
        if (updated != 1) {
            Integer exists = jdbc.queryForObject("SELECT COUNT(1) FROM dbo.disputes WHERE id = ?", Integer.class, disputeId);
            if (exists == null || exists == 0) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Dispute was not found.");
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Dispute is not in SUBMITTED status or already assigned.");
        }
        if (adminRepository != null) {
            adminRepository.audit(staffId, "DISPUTE_INTAKE", "DISPUTE", String.valueOf(disputeId),
                    Map.of("status", "SUBMITTED"), Map.of("status", "IN_MEDIATION"), "Staff assigned and opened mediation room", "127.0.0.1");
        }

        // Post official mediation notice to 3-party conversation and notify parties
        try {
            List<Map<String, Object>> rows = jdbc.queryForList("""
                    SELECT ticket_code, complainant_id, respondent_id
                    FROM dbo.disputes WHERE id = ?
                    """, disputeId);
            if (!rows.isEmpty()) {
                Map<String, Object> disp = rows.get(0);
                String ticketCode = (String) disp.get("ticket_code");
                long menteeId = ((Number) disp.get("complainant_id")).longValue();
                long mentorId = ((Number) disp.get("respondent_id")).longValue();

                List<Long> convRows = jdbc.queryForList("""
                        SELECT id FROM dbo.conversations WHERE dispute_id = ? AND conversation_type = 'MEDIATION'
                        """, Long.class, disputeId);
                Long convId = null;
                if (!convRows.isEmpty()) {
                    convId = convRows.get(0);
                } else {
                    KeyHolder kh = new GeneratedKeyHolder();
                    jdbc.update(con -> {
                        PreparedStatement ps = con.prepareStatement("""
                                INSERT INTO dbo.conversations (mentor_id, mentee_id, conversation_type, dispute_id, inquiry_status, created_at, updated_at)
                                VALUES (?, ?, 'MEDIATION', ?, 'APPROVED', SYSUTCDATETIME(), SYSUTCDATETIME())
                                """, new String[]{"id"});
                        ps.setLong(1, mentorId);
                        ps.setLong(2, menteeId);
                        ps.setLong(3, disputeId);
                        return ps;
                    }, kh);
                    convId = kh.getKey() != null ? kh.getKey().longValue() : null;
                }

                if (convId != null) {
                    String noticeText = String.format(
                            "⚖ [OFFICIAL DISPUTE MEDIATION NOTICE - CASE #%s]\n" +
                            "This conversation is now in 3-party dispute mediation overseen by Operational Staff (%s).\n" +
                            "Staff participates in monitoring mode to record facts and assist in fair resolution.\n" +
                            "Mentee and Mentor may directly exchange messages below to clarify and resolve the matter.",
                            ticketCode, staffName);

                    String clientKey = "MEDIATION_NOTICE_" + ticketCode + "_" + System.currentTimeMillis();
                    jdbc.update("""
                            INSERT INTO dbo.messages (conversation_id, sender_id, client_message_key, message_type, body, moderation_status, sent_at, delivered_at)
                            VALUES (?, ?, ?, 'TEXT', ?, 'ALLOWED', SYSUTCDATETIME(), SYSUTCDATETIME())
                            """, convId, staffId, clientKey, noticeText);

                    jdbc.update("""
                            UPDATE dbo.conversations
                            SET last_message_at = SYSUTCDATETIME(), updated_at = SYSUTCDATETIME()
                            WHERE id = ?
                            """, convId);

                    // Insert in-app notifications for both Mentee and Mentor
                    try {
                        jdbc.update("""
                                INSERT INTO dbo.notifications (user_id, title, message, type, action_url, is_read, created_at)
                                VALUES (?, 'Dispute Mediation Opened', ?, 'DISPUTE', '#/workspace', 0, SYSUTCDATETIME())
                                """, menteeId, "Dispute case #" + ticketCode + " has been opened for 3-party mediation.");

                        jdbc.update("""
                                INSERT INTO dbo.notifications (user_id, title, message, type, action_url, is_read, created_at)
                                VALUES (?, 'Dispute Mediation Opened', ?, 'DISPUTE', '#/workspace', 0, SYSUTCDATETIME())
                                """, mentorId, "Dispute case #" + ticketCode + " has been opened for 3-party mediation.");
                    } catch (Exception notifEx) {
                        // ignore if notification table schema mismatch
                    }
                }

                if (emailService != null) {
                    List<Map<String, Object>> users = jdbc.queryForList("""
                            SELECT id, email, full_name FROM dbo.users WHERE id IN (?, ?)
                            """, menteeId, mentorId);
                    for (Map<String, Object> u : users) {
                        String email = (String) u.get("email");
                        String fullName = (String) u.get("full_name");
                        String subject = "[HappyProgramming] Dispute Mediation Room Opened #" + ticketCode;
                        String emailBody = "Hello " + fullName + ",\n\n"
                                + "Dispute case #" + ticketCode + " has been assigned to HappyProgramming Staff (" + staffName + ").\n"
                                + "A 3-party mediation conversation is now active in your Mentorship Messages workspace.\n"
                                + "The mediator will monitor the conversation to help both parties achieve a fair resolution.\n\n"
                                + "Please sign in to HappyProgramming to participate in the discussion.\n\n"
                                + "Best regards,\nHappyProgramming Support Team";
                        try {
                            emailService.sendNotification(email, subject, emailBody);
                        } catch (Exception ignored) {}
                    }
                }
            }
        } catch (Exception ex) {
            // Log notice error without breaking intake transaction
        }

        return staffDisputeDetail(disputeId);
    }

    @Transactional
    public StaffDisputeDtos.StaffDetail staffResolve(long disputeId, StaffDisputeDtos.ResolveRequest request, AuthenticatedUser staffUser, String ip) {
        long staffId = staffUser != null && staffUser.id() != null ? staffUser.id() : 1L;
        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT id, status, disputed_amount, previous_target_status, target_type, booking_id, subscription_id, payment_id
                FROM dbo.disputes WITH (UPDLOCK, HOLDLOCK) WHERE id = ?
                """, disputeId);
        if (rows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Dispute was not found.");
        Map<String, Object> dispute = rows.get(0);
        String currentStatus = (String) dispute.get("status");
        if ("APPROVED".equals(currentStatus) || "RESOLVED".equals(currentStatus) || "REJECTED".equals(currentStatus)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Dispute has already been processed or finalized.");
        }
        BigDecimal disputedAmount = (BigDecimal) dispute.get("disputed_amount");
        String targetType = (String) dispute.get("target_type");
        Long bookingId = dispute.get("booking_id") != null ? ((Number) dispute.get("booking_id")).longValue() : null;
        Long subscriptionId = dispute.get("subscription_id") != null ? ((Number) dispute.get("subscription_id")).longValue() : null;
        String prevStatus = (String) dispute.get("previous_target_status");

        String newDisputeStatus;
        BigDecimal refundAmount = BigDecimal.ZERO;
        boolean isRefund = false;
        if ("FULL_REFUND".equals(request.resolutionType())) {
            newDisputeStatus = "APPROVED";
            refundAmount = disputedAmount;
            isRefund = true;
        } else if ("PARTIAL_REFUND".equals(request.resolutionType())) {
            newDisputeStatus = "APPROVED";
            if (request.refundAmount() == null || request.refundAmount().compareTo(BigDecimal.ZERO) <= 0
                    || request.refundAmount().compareTo(disputedAmount) > 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Partial refund amount must be between 1 and " + disputedAmount + " VND.");
            }
            refundAmount = request.refundAmount();
            isRefund = true;
        } else if ("RESCHEDULE".equals(request.resolutionType())) {
            newDisputeStatus = "RESOLVED";
            refundAmount = BigDecimal.ZERO;
        } else if ("REJECTED".equals(request.resolutionType())) {
            newDisputeStatus = "REJECTED";
            refundAmount = BigDecimal.ZERO;
        } else {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid resolution type.");
        }

        if (isRefund) {
            jdbc.update("""
                    UPDATE dbo.disputes
                    SET status = ?, resolution_type = ?, resolution_note = ?, refund_amount = ?,
                        approved_by = ?, approved_at = SYSUTCDATETIME(),
                        bank_name = COALESCE(?, bank_name),
                        account_number = COALESCE(?, account_number),
                        account_name = COALESCE(?, account_name),
                        assigned_staff_id = ?, updated_at = SYSUTCDATETIME()
                    WHERE id = ?
                    """, newDisputeStatus, request.resolutionType(), request.resolutionNote().trim(), refundAmount,
                    staffId, request.bankName(), request.accountNumber(), request.accountName(), staffId, disputeId);

            if (adminRepository != null) {
                adminRepository.audit(staffId, "DISPUTE_REFUND_APPROVED", "DISPUTE", String.valueOf(disputeId),
                        Map.of("status", currentStatus), Map.of("status", newDisputeStatus), "Staff approved refund of " + refundAmount + " VND for Admin transfer: " + request.resolutionNote().trim(), ip != null ? ip : "127.0.0.1");
            }
        } else {
            jdbc.update("""
                    UPDATE dbo.disputes
                    SET status = ?, resolution_type = ?, resolution_note = ?, refund_amount = ?,
                        resolved_at = SYSUTCDATETIME(), assigned_staff_id = ?, updated_at = SYSUTCDATETIME()
                    WHERE id = ?
                    """, newDisputeStatus, request.resolutionType(), request.resolutionNote().trim(), refundAmount, staffId, disputeId);

            // Restore target status if rejected or advance it if rescheduled
            if ("REJECTED".equals(newDisputeStatus)) {
                if ("ONE_OFF".equals(targetType) && bookingId != null) {
                    jdbc.update("UPDATE dbo.bookings SET status = ?, updated_at = SYSUTCDATETIME() WHERE id = ? AND status = 'DISPUTED'", prevStatus, bookingId);
                } else if ("MONTHLY".equals(targetType) && subscriptionId != null) {
                    jdbc.update("UPDATE dbo.subscriptions SET status = ?, updated_at = SYSUTCDATETIME() WHERE id = ? AND status = 'DISPUTED'", prevStatus, subscriptionId);
                }
            } else if ("RESCHEDULE".equals(request.resolutionType())) {
                if ("ONE_OFF".equals(targetType) && bookingId != null) {
                    jdbc.update("UPDATE dbo.bookings SET status = 'CONFIRMED', updated_at = SYSUTCDATETIME() WHERE id = ? AND status = 'DISPUTED'", bookingId);
                }
            }

            if (adminRepository != null) {
                adminRepository.audit(staffId, "DISPUTE_RESOLVED", "DISPUTE", String.valueOf(disputeId),
                        Map.of("status", currentStatus), Map.of("status", newDisputeStatus), request.resolutionNote().trim(), ip != null ? ip : "127.0.0.1");
            }
        }

        return staffDisputeDetail(disputeId);
    }

    @Transactional(readOnly = true)
    public List<AdminRefundRequest> adminPendingRefunds() {
        return queryAdminRefunds("WHERE d.status = 'APPROVED' ORDER BY d.approved_at ASC, d.id ASC");
    }

    @Transactional(readOnly = true)
    public List<AdminRefundRequest> adminRefundHistory() {
        return queryAdminRefunds("WHERE d.status IN ('APPROVED', 'RESOLVED', 'REJECTED') AND (d.resolution_type IN ('FULL_REFUND', 'PARTIAL_REFUND') OR d.refund_amount > 0 OR d.status = 'APPROVED') ORDER BY COALESCE(d.resolved_at, d.approved_at, d.created_at) DESC, d.id DESC");
    }

    private List<AdminRefundRequest> queryAdminRefunds(String whereClause) {
        String sql = """
                SELECT d.id, d.ticket_code, d.complainant_id, c.full_name AS complainant_name, c.email AS complainant_email,
                       d.respondent_id, r.full_name AS respondent_name, d.target_type, d.disputed_amount,
                       COALESCE(d.refund_amount, 0) AS refund_amount,
                       d.bank_name, d.account_name, d.account_number, d.status,
                       d.resolution_type, d.resolution_note, d.created_at,
                       d.approved_at, ap.full_name AS approved_by_name,
                       d.resolved_at, rev.full_name AS resolved_by_name,
                       d.transfer_reference
                FROM dbo.disputes d
                JOIN dbo.users c ON c.id = d.complainant_id
                JOIN dbo.users r ON r.id = d.respondent_id
                LEFT JOIN dbo.users ap ON ap.id = d.approved_by
                LEFT JOIN dbo.users rev ON rev.id = d.reviewed_by
                """ + " " + whereClause;
        return jdbc.query(sql, (rs, row) -> new AdminRefundRequest(
                rs.getLong("id"),
                rs.getString("ticket_code"),
                rs.getLong("complainant_id"),
                rs.getString("complainant_name"),
                rs.getString("complainant_email"),
                rs.getLong("respondent_id"),
                rs.getString("respondent_name"),
                rs.getString("target_type"),
                rs.getBigDecimal("disputed_amount"),
                rs.getBigDecimal("refund_amount"),
                rs.getString("bank_name"),
                rs.getString("account_name"),
                rs.getString("account_number"),
                rs.getString("status"),
                rs.getString("resolution_type"),
                rs.getString("resolution_note"),
                instant(rs.getTimestamp("created_at")),
                instant(rs.getTimestamp("approved_at")),
                rs.getString("approved_by_name"),
                instant(rs.getTimestamp("resolved_at")),
                rs.getString("resolved_by_name"),
                rs.getString("transfer_reference")
        ));
    }

    @Transactional
    public void adminDecideRefund(long disputeId, RefundDecisionRequest decision, AuthenticatedUser adminUser, String ip) {
        if (adminUser == null || !"ADMIN".equals(adminUser.role())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only administrators can process refunds.");
        }
        long adminId = adminUser.id() != null ? adminUser.id() : 1L;
        if (decision == null || decision.decision() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose PAID or REJECTED.");
        }
        String action = decision.decision().trim();
        if (!("PAID".equals(action) || "REJECTED".equals(action))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose PAID or REJECTED.");
        }
        if ("PAID".equals(action)) {
            String transferReference = decision.transferReference() == null ? "" : decision.transferReference().trim();
            if (transferReference.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Enter the bank transfer reference before marking this refund paid.");
            }
            if (transferReference.length() > 100) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Transfer reference is too long (max 100 characters).");
            }
        }
        if ("REJECTED".equals(action)) {
            String reason = decision.rejectionReason() == null ? "" : decision.rejectionReason().trim();
            if (reason.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Provide a reason for rejecting the refund.");
            }
        }

        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT id, ticket_code, status, disputed_amount, refund_amount, resolution_type, resolution_note,
                       previous_target_status, target_type, booking_id, subscription_id, payment_id, complainant_id
                FROM dbo.disputes WITH (UPDLOCK, HOLDLOCK) WHERE id = ?
                """, disputeId);
        if (rows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Dispute was not found.");
        Map<String, Object> dispute = rows.get(0);
        String currentStatus = (String) dispute.get("status");
        if (!"APPROVED".equals(currentStatus)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Dispute refund must be approved by staff before payment.");
        }

        String ticketCode = (String) dispute.get("ticket_code");
        BigDecimal refundAmount = (BigDecimal) dispute.get("refund_amount");
        String resolutionType = (String) dispute.get("resolution_type");
        String resolutionNote = (String) dispute.get("resolution_note");
        String targetType = (String) dispute.get("target_type");
        Long bookingId = dispute.get("booking_id") != null ? ((Number) dispute.get("booking_id")).longValue() : null;
        Long subscriptionId = dispute.get("subscription_id") != null ? ((Number) dispute.get("subscription_id")).longValue() : null;
        String prevStatus = (String) dispute.get("previous_target_status");
        Long paymentId = ((Number) dispute.get("payment_id")).longValue();
        Long complainantId = ((Number) dispute.get("complainant_id")).longValue();

        if ("PAID".equals(action)) {
            String transferReference = decision.transferReference().trim();

            // Create refund record in dbo.refunds
            String refundRef = "REFUND-" + ticketCode;
            KeyHolder keys = new GeneratedKeyHolder();
            jdbc.update(con -> {
                PreparedStatement ps = con.prepareStatement("""
                        INSERT INTO dbo.refunds(payment_id, refund_reference, amount, reason_code, reason_text,
                                                status, requested_by, gateway_refund_id, requested_at, completed_at)
                        VALUES (?, ?, ?, ?, ?, 'SUCCEEDED', ?, ?, SYSUTCDATETIME(), SYSUTCDATETIME())
                        """, new String[]{"id"});
                ps.setLong(1, paymentId);
                ps.setString(2, refundRef);
                ps.setBigDecimal(3, refundAmount);
                ps.setString(4, resolutionType != null ? resolutionType : "DISPUTE_REFUND");
                ps.setString(5, resolutionNote);
                ps.setLong(6, complainantId);
                ps.setString(7, transferReference);
                return ps;
            }, keys);
            Number refundId = keys.getKey();

            // Insert into dbo.escrow_ledger_entries
            if (refundId != null) {
                jdbc.update("""
                        INSERT INTO dbo.escrow_ledger_entries(payment_id, refund_id, entry_type, amount, idempotency_key, reason, created_by, created_at)
                        VALUES (?, ?, 'REFUND_OUT', ?, ?, ?, ?, SYSUTCDATETIME())
                        """, paymentId, refundId.longValue(), refundAmount, "REFUND:DISPUTE:" + disputeId,
                        "Admin executed refund transfer for ticket " + ticketCode, adminId);
            }

            // Advance target status
            if ("ONE_OFF".equals(targetType) && bookingId != null) {
                jdbc.update("UPDATE dbo.bookings SET status = 'CANCELLED', updated_at = SYSUTCDATETIME() WHERE id = ? AND status = 'DISPUTED'", bookingId);
            } else if ("MONTHLY".equals(targetType) && subscriptionId != null) {
                jdbc.update("UPDATE dbo.subscriptions SET status = 'CANCELLED', updated_at = SYSUTCDATETIME() WHERE id = ? AND status = 'DISPUTED'", subscriptionId);
            }

            // Update dispute status
            jdbc.update("""
                    UPDATE dbo.disputes
                    SET status = 'RESOLVED', reviewed_by = ?, transfer_reference = ?,
                        resolved_at = SYSUTCDATETIME(), updated_at = SYSUTCDATETIME()
                    WHERE id = ? AND status = 'APPROVED'
                    """, adminId, transferReference, disputeId);

            if (adminRepository != null) {
                adminRepository.audit(adminId, "DISPUTE_REFUND_PAID", "DISPUTE", String.valueOf(disputeId),
                        Map.of("status", "APPROVED"), Map.of("status", "RESOLVED"), "Bank transfer reference: " + transferReference, ip != null ? ip : "127.0.0.1");
            }
        } else if ("REJECTED".equals(action)) {
            String reason = decision.rejectionReason() == null ? "" : decision.rejectionReason().trim();
            if (reason.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Provide a reason for rejecting this refund.");
            }

            // Restore target status
            if ("ONE_OFF".equals(targetType) && bookingId != null) {
                jdbc.update("UPDATE dbo.bookings SET status = ?, updated_at = SYSUTCDATETIME() WHERE id = ? AND status = 'DISPUTED'", prevStatus, bookingId);
            } else if ("MONTHLY".equals(targetType) && subscriptionId != null) {
                jdbc.update("UPDATE dbo.subscriptions SET status = ?, updated_at = SYSUTCDATETIME() WHERE id = ? AND status = 'DISPUTED'", prevStatus, subscriptionId);
            }

            // Update dispute status
            jdbc.update("""
                    UPDATE dbo.disputes
                    SET status = 'REJECTED', reviewed_by = ?,
                        resolution_note = CASE WHEN resolution_note IS NULL THEN ? ELSE resolution_note + ' | Admin rejection: ' + ? END,
                        resolved_at = SYSUTCDATETIME(), updated_at = SYSUTCDATETIME()
                    WHERE id = ? AND status = 'APPROVED'
                    """, adminId, reason, reason, disputeId);

            if (adminRepository != null) {
                adminRepository.audit(adminId, "DISPUTE_REFUND_REJECTED", "DISPUTE", String.valueOf(disputeId),
                        Map.of("status", "APPROVED"), Map.of("status", "REJECTED"), reason, ip != null ? ip : "127.0.0.1");
            }
        }
    }

    private record Target(long id,long menteeId,long mentorId,String status,Instant startAt,Instant endAt,
                          Long paymentId,BigDecimal amount,String currency,String type) {}
    private record ValidatedFile(String name,String mime,byte[] bytes,String checksum) {}
}
