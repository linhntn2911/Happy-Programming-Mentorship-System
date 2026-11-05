package com.happyprogramming.service;

import com.happyprogramming.dto.AuthenticatedUser;
import com.happyprogramming.dto.DisputeFileDownload;
import com.happyprogramming.dto.MentorDisputeDetail;
import com.happyprogramming.dto.MentorDisputeSummary;
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

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Mentor-side dispute access (SRS G3 V1.1 §10.8 UC71 Provide Dispute Response).
 * The mentor is only the respondent: this service exposes list/detail/respond/evidence-download
 * and never changes dispute status, resolution, or refund state.
 */
@Service
public class MentorDisputeService {
    private static final long MAX_FILE_BYTES = 10L * 1024 * 1024;
    private static final int MAX_FILES_PER_RESPONSE = 5;
    private static final Set<String> ALLOWED_FILE_TYPES = Set.of(
            "application/pdf", "application/zip", "application/x-zip-compressed",
            "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "text/plain", "text/csv", "image/png", "image/jpeg", "image/gif", "image/webp");
    private static final Set<String> LIST_STATUSES = Set.of("SUBMITTED", "IN_MEDIATION", "RESOLVED", "REJECTED");
    private final JdbcTemplate jdbc;

    public MentorDisputeService(@Autowired(required = false) JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional(readOnly = true)
    public List<MentorDisputeSummary> list(String status) {
        long mentorId = requireMentor();
        String filter = status == null || status.isBlank() ? null : status.trim().toUpperCase();
        if (filter != null && !LIST_STATUSES.contains(filter))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown dispute status filter.");
        StringBuilder sql = new StringBuilder("""
                SELECT d.id,d.status,d.reason_code,d.description,d.booking_id,d.subscription_id,
                    b.booking_code,u.full_name AS complainant_name,d.resolution,d.created_at,d.updated_at,
                    (SELECT COUNT(*) FROM dbo.dispute_responses r WHERE r.dispute_id=d.id) AS response_count,
                    CASE WHEN EXISTS(SELECT 1 FROM dbo.dispute_responses r
                        WHERE r.dispute_id=d.id AND r.author_id=d.respondent_id) THEN 1 ELSE 0 END AS responded
                FROM dbo.disputes d
                JOIN dbo.users u ON u.id=d.complainant_id
                LEFT JOIN dbo.bookings b ON b.id=d.booking_id
                WHERE d.respondent_id=?
                """);
        List<Object> args = new ArrayList<>();
        args.add(mentorId);
        if (filter != null) {
            sql.append(" AND d.status=?");
            args.add(filter);
        }
        sql.append(" ORDER BY d.created_at DESC,d.id DESC");
        return db().query(sql.toString(), (rs, n) -> new MentorDisputeSummary(
                rs.getLong("id"), rs.getString("status"), rs.getString("reason_code"), rs.getString("description"),
                targetType(rs), targetId(rs), targetLabel(rs), rs.getString("complainant_name"),
                rs.getString("resolution"), rs.getInt("response_count"), rs.getInt("responded") == 1,
                rs.getTimestamp("created_at").toInstant(), rs.getTimestamp("updated_at").toInstant()),
                args.toArray());
    }

    @Transactional(readOnly = true)
    public MentorDisputeDetail detail(long disputeId) {
        long mentorId = requireMentor();
        return loadDetail(db(), disputeId, mentorId);
    }

    @Transactional
    public MentorDisputeDetail respond(long disputeId, String message, List<MultipartFile> files) {
        long mentorId = requireMentor();
        JdbcTemplate db = db();
        Map<String, Object> dispute = db.query("""
                SELECT id,respondent_id,status FROM dbo.disputes WITH (UPDLOCK,HOLDLOCK) WHERE id=?
                """, (rs, n) -> Map.<String, Object>of("id", rs.getLong("id"),
                "respondentId", rs.getLong("respondent_id"), "status", rs.getString("status")), disputeId)
                .stream().findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Dispute not found."));
        if (((Number) dispute.get("respondentId")).longValue() != mentorId)
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not the respondent of this dispute.");
        String status = (String) dispute.get("status");
        if (!"SUBMITTED".equals(status) && !"IN_MEDIATION".equals(status))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This dispute is closed and no longer accepts responses.");

        String body = message == null ? "" : message.trim();
        if (body.length() < 5 || body.length() > 2000)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Write a response between 5 and 2000 characters.");
        List<MultipartFile> attachments = files == null ? List.of() : files.stream()
                .filter(file -> file != null && !file.isEmpty()).toList();
        if (attachments.size() > MAX_FILES_PER_RESPONSE)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Attach at most 5 files per response.");
        List<PreparedEvidence> prepared = attachments.stream().map(MentorDisputeService::prepare).toList();

        Long responseId = db.queryForObject("""
                INSERT INTO dbo.dispute_responses(dispute_id,author_id,author_side,message)
                OUTPUT INSERTED.id VALUES (?,?,'MENTOR',?)
                """, Long.class, disputeId, mentorId, body);
        if (responseId == null) throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Response could not be saved.");
        for (PreparedEvidence item : prepared) storeEvidence(db, disputeId, responseId, mentorId, item);
        db.update("UPDATE dbo.disputes SET updated_at=SYSUTCDATETIME() WHERE id=?", disputeId);
        return loadDetail(db, disputeId, mentorId);
    }

    @Transactional(readOnly = true)
    public DisputeFileDownload downloadEvidence(long disputeId, long evidenceId) {
        long mentorId = requireMentor();
        requireRespondent(db(), disputeId, mentorId);
        return db().query("""
                SELECT f.original_name,f.mime_type,f.size_bytes,f.file_content
                FROM dbo.dispute_evidence e JOIN dbo.files f ON f.id=e.file_id
                WHERE e.id=? AND e.dispute_id=? AND f.status='READY'
                """, (rs, n) -> new DisputeFileDownload(rs.getString("original_name"), rs.getString("mime_type"),
                rs.getLong("size_bytes"), rs.getBytes("file_content")), evidenceId, disputeId)
                .stream().findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Dispute evidence not found."));
    }

    private void requireRespondent(JdbcTemplate db, long disputeId, long mentorId) {
        Long respondent = db.query("SELECT respondent_id FROM dbo.disputes WHERE id=?",
                (rs, n) -> rs.getLong("respondent_id"), disputeId)
                .stream().findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Dispute not found."));
        if (respondent != mentorId)
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not the respondent of this dispute.");
    }

    private MentorDisputeDetail loadDetail(JdbcTemplate db, long disputeId, long mentorId) {
        requireRespondent(db, disputeId, mentorId);
        var head = db.query("""
                SELECT d.id,d.status,d.reason_code,d.description,d.booking_id,d.subscription_id,
                    b.booking_code,u.full_name AS complainant_name,d.resolution,d.resolution_note,
                    d.resolved_at,d.created_at,
                    CASE WHEN EXISTS(SELECT 1 FROM dbo.dispute_responses r
                        WHERE r.dispute_id=d.id AND r.author_id=d.respondent_id) THEN 1 ELSE 0 END AS responded
                FROM dbo.disputes d
                JOIN dbo.users u ON u.id=d.complainant_id
                LEFT JOIN dbo.bookings b ON b.id=d.booking_id
                WHERE d.id=? AND d.respondent_id=?
                """, (rs, n) -> new DetailHead(rs.getLong("id"), rs.getString("status"), rs.getString("reason_code"),
                rs.getString("description"), targetType(rs), targetId(rs), targetLabel(rs),
                rs.getString("complainant_name"), rs.getString("resolution"), rs.getString("resolution_note"),
                instant(rs.getTimestamp("resolved_at")), rs.getTimestamp("created_at").toInstant(),
                rs.getInt("responded") == 1), disputeId, mentorId)
                .stream().findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Dispute not found."));

        List<EvidenceRow> evidence = db.query("""
                SELECT e.id,e.response_id,e.file_id,e.uploaded_side,e.created_at,
                    f.original_name,f.mime_type,f.size_bytes
                FROM dbo.dispute_evidence e JOIN dbo.files f ON f.id=e.file_id
                WHERE e.dispute_id=? ORDER BY e.id
                """, (rs, n) -> new EvidenceRow(rs.getLong("id"),
                rs.getLong("response_id") == 0 && rs.wasNull() ? null : rs.getLong("response_id"),
                rs.getLong("file_id"), rs.getString("uploaded_side"), rs.getTimestamp("created_at").toInstant(),
                rs.getString("original_name"), rs.getString("mime_type"), rs.getLong("size_bytes")), disputeId);

        List<MentorDisputeDetail.Evidence> submissionEvidence = new ArrayList<>();
        Map<Long, List<MentorDisputeDetail.Evidence>> perResponse = new LinkedHashMap<>();
        for (EvidenceRow row : evidence) {
            var item = new MentorDisputeDetail.Evidence(row.id(), row.fileId(), row.fileName(), row.mimeType(),
                    row.sizeBytes(), row.uploadedSide(), row.createdAt());
            if (row.responseId() == null) submissionEvidence.add(item);
            else perResponse.computeIfAbsent(row.responseId(), key -> new ArrayList<>()).add(item);
        }

        var responses = db.query("""
                SELECT r.id,r.author_side,r.message,r.created_at,u.full_name AS author_name
                FROM dbo.dispute_responses r JOIN dbo.users u ON u.id=r.author_id
                WHERE r.dispute_id=? ORDER BY r.created_at,r.id
                """, (rs, n) -> new MentorDisputeDetail.Response(rs.getLong("id"), rs.getString("author_side"),
                rs.getString("author_name"), rs.getString("message"), rs.getTimestamp("created_at").toInstant(),
                List.copyOf(perResponse.getOrDefault(rs.getLong("id"), List.of()))), disputeId);
        return new MentorDisputeDetail(head.id(), head.status(), head.reasonCode(), head.description(),
                head.targetType(), head.targetId(), head.targetLabel(), head.complainantName(), head.resolution(),
                head.resolutionNote(), head.resolvedAt(), head.createdAt(), head.responded(),
                List.copyOf(submissionEvidence), responses);
    }

    private static PreparedEvidence prepare(MultipartFile file) {
        if (file.getSize() > MAX_FILE_BYTES)
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Files must be 10 MB or smaller.");
        String mimeType = file.getContentType() == null ? "" : file.getContentType().trim().toLowerCase();
        if (!ALLOWED_FILE_TYPES.contains(mimeType))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "This file type is not supported. Upload a document, text file, or image.");
        try {
            return new PreparedEvidence(safeFileName(file.getOriginalFilename()), mimeType, file.getBytes());
        } catch (java.io.IOException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The selected file could not be read.");
        }
    }

    private void storeEvidence(JdbcTemplate db, long disputeId, long responseId, long mentorId, PreparedEvidence evidence) {
        String storageKey = "disputes/" + disputeId + "/" + responseId + "/" + UUID.randomUUID() + "/" + evidence.fileName();
        KeyHolder keys = new GeneratedKeyHolder();
        db.update(connection -> {
            PreparedStatement ps = connection.prepareStatement("""
                    INSERT INTO dbo.files
                        (uploaded_by, original_name, storage_key, mime_type, size_bytes, checksum,
                         file_content, visibility, status, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 'AUTHORIZED', 'READY', SYSUTCDATETIME(), SYSUTCDATETIME())
                    """, new String[] {"id"});
            ps.setLong(1, mentorId);
            ps.setString(2, evidence.fileName());
            ps.setString(3, storageKey.length() > 500 ? storageKey.substring(storageKey.length() - 500) : storageKey);
            ps.setString(4, evidence.mimeType());
            ps.setLong(5, evidence.content().length);
            ps.setString(6, sha256(evidence.content()));
            ps.setBytes(7, evidence.content());
            return ps;
        }, keys);
        Number fileId = keys.getKey();
        if (fileId == null) throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Evidence could not be stored.");
        db.update("""
                INSERT INTO dbo.dispute_evidence(dispute_id,response_id,file_id,uploaded_by,uploaded_side)
                VALUES (?,?,?,?, 'MENTOR')
                """, disputeId, responseId, fileId.longValue(), mentorId);
    }

    private static String targetType(ResultSet rs) throws SQLException {
        return rs.getLong("booking_id") != 0 || !rs.wasNull() ? "BOOKING" : "SUBSCRIPTION";
    }

    private static Long targetId(ResultSet rs) throws SQLException {
        long bookingId = rs.getLong("booking_id");
        if (bookingId != 0 || !rs.wasNull()) return bookingId;
        long subscriptionId = rs.getLong("subscription_id");
        return subscriptionId == 0 && rs.wasNull() ? null : subscriptionId;
    }

    private static String targetLabel(ResultSet rs) throws SQLException {
        String bookingCode = rs.getString("booking_code");
        if (bookingCode != null && !bookingCode.isBlank()) return "Session " + bookingCode;
        long subscriptionId = rs.getLong("subscription_id");
        return subscriptionId == 0 && rs.wasNull() ? "Mentorship" : "Mentorship #" + subscriptionId;
    }

    private static Instant instant(Timestamp value) {
        return value == null ? null : value.toInstant();
    }

    private static String safeFileName(String value) {
        String name = value == null ? "attachment" : value.replace('\\', '/');
        name = name.substring(name.lastIndexOf('/') + 1).replaceAll("[\\p{Cntrl}]", "").trim();
        if (name.isEmpty()) name = "attachment";
        return name.length() > 200 ? name.substring(name.length() - 200) : name;
    }

    private static String sha256(byte[] content) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(content));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is unavailable.", exception);
        }
    }

    private long requireMentor() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof AuthenticatedUser user) || user.id() == null)
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please log in to continue.");
        if (user.roles() == null || !user.roles().contains("MENTOR"))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This account is not authorized to view disputes.");
        return user.id();
    }

    private JdbcTemplate db() {
        if (jdbc == null) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Dispute service is temporarily unavailable.");
        return jdbc;
    }

    private record DetailHead(long id, String status, String reasonCode, String description, String targetType,
                              Long targetId, String targetLabel, String complainantName, String resolution,
                              String resolutionNote, Instant resolvedAt, Instant createdAt, boolean responded) { }

    private record EvidenceRow(long id, Long responseId, long fileId, String uploadedSide, Instant createdAt,
                               String fileName, String mimeType, long sizeBytes) { }

    private record PreparedEvidence(String fileName, String mimeType, byte[] content) { }
}
