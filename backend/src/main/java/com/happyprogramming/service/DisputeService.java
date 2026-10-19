package com.happyprogramming.service;

import com.happyprogramming.dto.AuthenticatedUser;
import com.happyprogramming.dto.DisputeDtos;
import com.happyprogramming.dto.DisputeFileDownload;
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

    public DisputeService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
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
                                    AND d.status IN ('SUBMITTED','IN_MEDIATION','AWAITING_EVIDENCE'))
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
                                    AND d.status IN ('SUBMITTED','IN_MEDIATION','AWAITING_EVIDENCE'))
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
                    AND TRY_CONVERT(BIGINT,JSON_VALUE(b.terms_snapshot,'$.requestId'))=?
                  UNION ALL
                  SELECT 'MONTHLY',s.id,
                         COALESCE(JSON_VALUE(s.plan_snapshot,'$.name'),N'Monthly mentorship'),u.full_name,
                         s.activated_at,p.amount,p.currency
                  FROM dbo.subscriptions s
                  JOIN dbo.users u ON u.id=s.mentor_id
                  JOIN dbo.payments p ON p.request_id=s.request_id AND p.status='SUCCEEDED'
                  WHERE s.mentee_id=? AND s.request_id=?
                ) targets
                """, (rs, row) -> new DisputeDtos.EligibleTarget(
                rs.getString("target_type"), rs.getLong("target_id"), rs.getString("title"),
                rs.getString("mentor_name"), instant(rs.getTimestamp("scheduled_at")),
                rs.getBigDecimal("amount"), rs.getString("currency")), menteeId, requestId, menteeId, requestId);
        if (targets.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No paid booking or mentorship found for this request.");
        }
        return targets.get(0);
    }

    @Transactional
    public DisputeDtos.Detail submit(String targetType, long targetId, String category,
                                     String description, boolean termsAccepted,
                                     List<MultipartFile> evidenceFiles) {
        return submit(targetType, targetId, null, category, description, termsAccepted, evidenceFiles);
    }

    @Transactional
    public DisputeDtos.Detail submit(String targetType, Long targetId, Long requestId, String category,
                                     String description, boolean termsAccepted,
                                     List<MultipartFile> evidenceFiles) {
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
                  AND status IN ('SUBMITTED','IN_MEDIATION','AWAITING_EVIDENCE')
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
                        status,terms_accepted_at,created_at,updated_at)
                    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'SUBMITTED',SYSUTCDATETIME(),SYSUTCDATETIME(),SYSUTCDATETIME())
                    """, new String[] {"id"});
            ps.setString(1, ticket); ps.setLong(2, menteeId); ps.setLong(3, target.mentorId());
            if ("ONE_OFF".equals(finalType)) { ps.setLong(4, finalTargetId); ps.setNull(5, java.sql.Types.BIGINT); }
            else { ps.setNull(4, java.sql.Types.BIGINT); ps.setLong(5, finalTargetId); }
            ps.setLong(6, target.paymentId()); ps.setString(7, finalType); ps.setString(8, target.status());
            ps.setString(9, normalizedCategory); ps.setString(10, body);
            ps.setBigDecimal(11, target.amount()); ps.setString(12, target.currency());
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
        return jdbc.query(summarySql() + " WHERE d.complainant_id=? ORDER BY d.created_at DESC,d.id DESC",
                (rs, row) -> summary(rs), menteeId);
    }

    @Transactional(readOnly = true)
    public DisputeDtos.Detail detail(long disputeId) {
        long menteeId = requireMentee();
        List<DisputeDtos.Detail> rows = jdbc.query("""
                SELECT d.id,d.ticket_code,d.target_type,COALESCE(d.booking_id,d.subscription_id) target_id,
                       COALESCE(o.name,JSON_VALUE(s.plan_snapshot,'$.name'),N'Mentorship') title,
                       mentor.full_name mentor_name,COALESCE(b.start_at,s.activated_at) scheduled_at,
                       d.disputed_amount,d.currency,d.category,d.description,d.status,d.created_at,
                       d.resolution_type,d.resolution_note,d.refund_amount,d.resolved_at
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
                instant(rs.getTimestamp("resolved_at")), List.of()), disputeId, menteeId);
        if (!rows.isEmpty()) {
            DisputeDtos.Detail item = rows.get(0);
            return new DisputeDtos.Detail(item.id(), item.ticketCode(), item.targetType(), item.targetId(),
                    item.title(), item.mentorName(), item.scheduledAt(), item.disputedAmount(), item.currency(),
                    item.category(), item.description(), item.status(), item.createdAt(), item.resolutionType(),
                    item.resolutionNote(), item.refundAmount(), item.resolvedAt(), evidence(disputeId, menteeId));
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

    private record Target(long id,long menteeId,long mentorId,String status,Instant startAt,Instant endAt,
                          Long paymentId,BigDecimal amount,String currency,String type) {}
    private record ValidatedFile(String name,String mime,byte[] bytes,String checksum) {}
}
