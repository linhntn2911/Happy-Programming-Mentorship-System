package com.happyprogramming.repository;

import java.sql.PreparedStatement;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class MentorshipWorkspaceRepository {
    private static final String WORKSPACE_SELECT = """
            SELECT c.id AS conversation_id,
                   monthly.subscription_id, monthly.request_id,
                   c.mentor_id, mentor.full_name AS mentor_name,
                   c.mentee_id, mentee.full_name AS mentee_name,
                   COALESCE(monthly.package_name,
                            CASE WHEN sessions.session_count > 0 THEN N'One-off sessions' END,
                            N'Mentorship') AS package_name,
                   COALESCE(monthly.subscription_status,
                            CASE WHEN sessions.session_count > 0 THEN 'ONE_OFF' END) AS subscription_status,
                   monthly.current_period_start, monthly.current_period_end,
                   monthly.calls_per_period, monthly.session_duration_minutes,
                   monthly.learning_goals, c.inquiry_status,
                   CASE WHEN monthly.subscription_id IS NULL THEN CAST(0 AS bit) ELSE CAST(1 AS bit) END AS has_monthly,
                   COALESCE(sessions.session_count, 0) AS one_off_session_count,
                   COALESCE(sessions.upcoming_count, 0) AS upcoming_session_count,
                   sessions.next_session_at
            FROM dbo.conversations c
            JOIN dbo.users mentor ON mentor.id = c.mentor_id
            JOIN dbo.users mentee ON mentee.id = c.mentee_id
            OUTER APPLY (
                SELECT TOP (1)
                       s.id AS subscription_id, s.request_id,
                       COALESCE(JSON_VALUE(s.plan_snapshot, '$.name'),
                                JSON_VALUE(r.offer_snapshot, '$.name'), N'Monthly Mentorship') AS package_name,
                       s.status AS subscription_status, s.current_period_start, s.current_period_end,
                       TRY_CONVERT(INT, JSON_VALUE(s.plan_snapshot, '$.callsPerPeriod')) AS calls_per_period,
                       TRY_CONVERT(INT, JSON_VALUE(s.plan_snapshot, '$.sessionDurationMinutes')) AS session_duration_minutes,
                       r.learning_goals
                FROM dbo.subscriptions s
                JOIN dbo.mentorship_requests r ON r.id = s.request_id
                WHERE s.mentor_id = c.mentor_id AND s.mentee_id = c.mentee_id
                  AND s.status IN ('TRIALING','ACTIVE')
                ORDER BY s.activated_at DESC, s.id DESC
            ) monthly
            OUTER APPLY (
                SELECT COUNT_BIG(*) AS session_count,
                       SUM(CASE WHEN b.status = 'CONFIRMED' AND b.end_at >= SYSUTCDATETIME() THEN 1 ELSE 0 END) AS upcoming_count,
                       MIN(CASE WHEN b.status = 'CONFIRMED' AND b.end_at >= SYSUTCDATETIME() THEN b.start_at END) AS next_session_at
                FROM dbo.bookings b
                WHERE b.mentor_id = c.mentor_id AND b.mentee_id = c.mentee_id
                  AND b.service_type = 'ONE_OFF'
                  AND b.status IN ('CONFIRMED','COMPLETED','NO_SHOW_REVIEW','NO_SHOW')
            ) sessions
            WHERE c.inquiry_status = 'APPROVED'
              AND (monthly.subscription_id IS NOT NULL OR sessions.session_count > 0)
            """;
    private static final String MESSAGE_SELECT = """
            SELECT m.id, m.sender_id, sender.full_name AS sender_name,
                   m.message_type, m.body, m.code_language, m.sent_at, m.client_message_key,
                   f.id AS file_id, f.original_name AS file_name, f.mime_type AS file_mime_type,
                   f.size_bytes AS file_size_bytes
            FROM dbo.messages m
            JOIN dbo.users sender ON sender.id = m.sender_id
            LEFT JOIN dbo.attachments a ON a.message_id = m.id
            LEFT JOIN dbo.files f ON f.id = a.file_id AND f.status = 'READY'
            """;

    private final JdbcTemplate jdbc;

    public MentorshipWorkspaceRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<WorkspaceRow> findForUser(long userId) {
        return jdbc.query(WORKSPACE_SELECT + " AND (c.mentor_id = ? OR c.mentee_id = ?) ORDER BY COALESCE(sessions.next_session_at, monthly.current_period_start) DESC, c.id DESC",
                MentorshipWorkspaceRepository::mapWorkspace, userId, userId);
    }

    public Optional<WorkspaceRow> findAccessibleByConversationId(long conversationId) {
        List<WorkspaceRow> rows = jdbc.query(WORKSPACE_SELECT + " AND c.id = ?",
                MentorshipWorkspaceRepository::mapWorkspace, conversationId);
        return rows.stream().findFirst();
    }

    public List<OneOffBookingRow> findOneOffBookings(long conversationId) {
        return jdbc.query("""
                SELECT b.id, b.booking_code, b.service_id,
                       COALESCE(so.name, N'One-off session') AS session_name,
                       b.agenda, b.start_at, b.end_at, b.price_snapshot, b.currency, b.status,
                       COALESCE(TRY_CONVERT(INT, JSON_VALUE(b.terms_snapshot, '$.numberOfParticipants')), 1) AS participants,
                       r.id AS review_id, r.rating AS review_rating, r.comment AS review_comment
                FROM dbo.bookings b
                JOIN dbo.conversations c
                  ON c.mentor_id = b.mentor_id AND c.mentee_id = b.mentee_id
                LEFT JOIN dbo.service_offerings so
                  ON so.id = b.service_id AND so.mentor_id = b.mentor_id AND so.service_type = 'ONE_OFF'
                LEFT JOIN dbo.reviews r
                  ON r.booking_id = b.id
                WHERE c.id = ? AND b.service_type = 'ONE_OFF'
                  AND b.status IN ('CONFIRMED','COMPLETED','NO_SHOW_REVIEW','NO_SHOW')
                ORDER BY CASE WHEN b.status = 'CONFIRMED' AND b.end_at >= SYSUTCDATETIME() THEN 0 ELSE 1 END,
                         CASE WHEN b.status = 'CONFIRMED' AND b.end_at >= SYSUTCDATETIME() THEN b.start_at END ASC,
                         b.start_at DESC, b.id DESC
                """, (rs, row) -> new OneOffBookingRow(
                        rs.getLong("id"), rs.getString("booking_code"), rs.getLong("service_id"),
                        rs.getString("session_name"), rs.getString("agenda"),
                        instant(rs.getTimestamp("start_at")), instant(rs.getTimestamp("end_at")),
                        rs.getBigDecimal("price_snapshot"), rs.getString("currency"),
                        rs.getString("status"), rs.getInt("participants"),
                        rs.getObject("review_id") != null ? rs.getLong("review_id") : null,
                        rs.getObject("review_rating") != null ? rs.getInt("review_rating") : null,
                        rs.getString("review_comment")), conversationId);
    }

    public List<MessageRow> findLatestMessages(long conversationId, int limit) {
        return jdbc.query("""
                SELECT recent.id, recent.sender_id, sender.full_name AS sender_name,
                       recent.message_type, recent.body, recent.code_language, recent.sent_at,
                       recent.client_message_key, f.id AS file_id, f.original_name AS file_name,
                       f.mime_type AS file_mime_type, f.size_bytes AS file_size_bytes
                FROM (
                    SELECT TOP (?) id, sender_id, message_type, body, code_language, sent_at, client_message_key
                    FROM dbo.messages
                    WHERE conversation_id = ? AND moderation_status <> 'BLOCKED'
                    ORDER BY id DESC
                ) recent
                JOIN dbo.users sender ON sender.id = recent.sender_id
                LEFT JOIN dbo.attachments a ON a.message_id = recent.id
                LEFT JOIN dbo.files f ON f.id = a.file_id AND f.status = 'READY'
                ORDER BY recent.id
                """, (rs, row) -> new MessageRow(
                        rs.getLong("id"),
                        rs.getLong("sender_id"),
                        rs.getString("sender_name"),
                        rs.getString("message_type"),
                        rs.getString("body"),
                        rs.getString("code_language"),
                        instant(rs.getTimestamp("sent_at")),
                        rs.getString("client_message_key"),
                        nullableLong(rs, "file_id"), rs.getString("file_name"),
                        rs.getString("file_mime_type"), nullableLong(rs, "file_size_bytes")), limit, conversationId);
    }

    public Optional<MessageRow> findBySenderAndClientKey(long senderId, String clientMessageKey) {
        List<MessageRow> rows = jdbc.query(MESSAGE_SELECT + " WHERE m.sender_id = ? AND m.client_message_key = ?",
                (rs, row) -> new MessageRow(
                        rs.getLong("id"),
                        rs.getLong("sender_id"),
                        rs.getString("sender_name"),
                        rs.getString("message_type"),
                        rs.getString("body"),
                        rs.getString("code_language"),
                        instant(rs.getTimestamp("sent_at")),
                        rs.getString("client_message_key"),
                        nullableLong(rs, "file_id"), rs.getString("file_name"),
                        rs.getString("file_mime_type"), nullableLong(rs, "file_size_bytes")),
                senderId, clientMessageKey);
        return rows.stream().findFirst();
    }

    public MessageRow insertMessage(long conversationId, long senderId, String clientMessageKey,
                                    String messageType, String body, String codeLanguage) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            PreparedStatement ps = connection.prepareStatement("""
                    INSERT INTO dbo.messages
                        (conversation_id, sender_id, client_message_key, message_type, body,
                         code_language, moderation_status, sent_at, delivered_at)
                    VALUES (?, ?, ?, ?, ?, ?, 'ALLOWED', SYSUTCDATETIME(), SYSUTCDATETIME())
                    """, new String[] {"id"});
            ps.setLong(1, conversationId);
            ps.setLong(2, senderId);
            ps.setString(3, clientMessageKey);
            ps.setString(4, messageType);
            ps.setString(5, body);
            ps.setString(6, codeLanguage);
            return ps;
        }, keyHolder);
        Number id = keyHolder.getKey();
        if (id == null) throw new IllegalStateException("Workspace message could not be created.");
        jdbc.update("""
                UPDATE dbo.conversations
                SET last_message_at = SYSUTCDATETIME(), updated_at = SYSUTCDATETIME()
                WHERE id = ?
                """, conversationId);
        return findBySenderAndClientKey(senderId, clientMessageKey)
                .orElseThrow(() -> new IllegalStateException("Workspace message could not be reloaded."));
    }

    public MessageRow insertFileMessage(long conversationId, long senderId, String clientMessageKey,
                                        String originalName, String mimeType, byte[] content, String checksum) {
        KeyHolder fileKeys = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            PreparedStatement ps = connection.prepareStatement("""
                    INSERT INTO dbo.files
                        (uploaded_by, original_name, storage_key, mime_type, size_bytes, checksum,
                         file_content, visibility, status, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 'AUTHORIZED', 'READY', SYSUTCDATETIME(), SYSUTCDATETIME())
                    """, new String[] {"id"});
            ps.setLong(1, senderId);
            ps.setString(2, originalName);
            ps.setString(3, "workspace/" + conversationId + "/" + clientMessageKey);
            ps.setString(4, mimeType);
            ps.setLong(5, content.length);
            ps.setString(6, checksum);
            ps.setBytes(7, content);
            return ps;
        }, fileKeys);
        Number fileId = fileKeys.getKey();
        if (fileId == null) throw new IllegalStateException("Workspace file could not be stored.");

        MessageRow message = insertMessage(
                conversationId, senderId, clientMessageKey, "FILE", originalName, null);
        jdbc.update("INSERT INTO dbo.attachments(file_id, message_id, created_at) VALUES (?, ?, SYSUTCDATETIME())",
                fileId.longValue(), message.id());
        return findBySenderAndClientKey(senderId, clientMessageKey)
                .orElseThrow(() -> new IllegalStateException("Workspace attachment could not be reloaded."));
    }

    public Optional<FileRow> findFile(long conversationId, long messageId) {
        List<FileRow> rows = jdbc.query("""
                SELECT f.id, f.original_name, f.mime_type, f.size_bytes, f.file_content
                FROM dbo.messages m
                JOIN dbo.attachments a ON a.message_id = m.id
                JOIN dbo.files f ON f.id = a.file_id
                WHERE m.id = ? AND m.conversation_id = ? AND f.status = 'READY'
                """, (rs, row) -> new FileRow(
                        rs.getLong("id"), rs.getString("original_name"),
                        rs.getString("mime_type"), rs.getLong("size_bytes"),
                        rs.getBytes("file_content")), messageId, conversationId);
        return rows.stream().findFirst();
    }

    public long countUnread(long conversationId, long userId) {
        Long count = jdbc.queryForObject("""
                SELECT COUNT_BIG(*)
                FROM dbo.messages m
                JOIN dbo.conversations c ON c.id = m.conversation_id
                WHERE c.id = ? AND m.sender_id <> ? AND m.moderation_status <> 'BLOCKED'
                  AND m.id > COALESCE(
                      CASE WHEN c.mentor_id = ? THEN c.mentor_last_read_message_id
                           ELSE c.mentee_last_read_message_id END, 0)
                """, Long.class, conversationId, userId, userId);
        return count == null ? 0L : count;
    }

    public void markRead(long conversationId, long userId, boolean mentor) {
        String column = mentor ? "mentor_last_read_message_id" : "mentee_last_read_message_id";
        String memberColumn = mentor ? "mentor_id" : "mentee_id";
        jdbc.update("""
                UPDATE dbo.conversations
                SET %s = (SELECT MAX(id) FROM dbo.messages WHERE conversation_id = ?),
                    updated_at = SYSUTCDATETIME()
                WHERE id = ? AND %s = ?
                """.formatted(column, memberColumn), conversationId, conversationId, userId);
    }

    private static WorkspaceRow mapWorkspace(java.sql.ResultSet rs, int row) throws java.sql.SQLException {
        Number conversation = (Number) rs.getObject("conversation_id");
        Number calls = (Number) rs.getObject("calls_per_period");
        Number duration = (Number) rs.getObject("session_duration_minutes");
        Number subscription = (Number) rs.getObject("subscription_id");
        Number request = (Number) rs.getObject("request_id");
        return new WorkspaceRow(
                conversation.longValue(),
                subscription == null ? null : subscription.longValue(),
                request == null ? null : request.longValue(),
                rs.getLong("mentor_id"), rs.getString("mentor_name"),
                rs.getLong("mentee_id"), rs.getString("mentee_name"),
                rs.getString("package_name"), rs.getString("subscription_status"),
                instant(rs.getTimestamp("current_period_start")),
                instant(rs.getTimestamp("current_period_end")),
                calls == null ? null : calls.intValue(),
                duration == null ? null : duration.intValue(),
                rs.getString("learning_goals"), rs.getString("inquiry_status"),
                rs.getBoolean("has_monthly"), rs.getInt("one_off_session_count"),
                rs.getInt("upcoming_session_count"), instant(rs.getTimestamp("next_session_at")));
    }

    private static Instant instant(Timestamp value) {
        return value == null ? null : value.toLocalDateTime().toInstant(ZoneOffset.UTC);
    }

    private static Long nullableLong(java.sql.ResultSet rs, String column) throws java.sql.SQLException {
        Number value = (Number) rs.getObject(column);
        return value == null ? null : value.longValue();
    }

    public record WorkspaceRow(
            long conversationId, Long subscriptionId, Long requestId,
            long mentorId, String mentorName, long menteeId, String menteeName,
            String packageName, String subscriptionStatus,
            Instant currentPeriodStart, Instant currentPeriodEnd,
            Integer callsPerPeriod, Integer sessionDurationMinutes,
            String learningGoals, String conversationStatus,
            boolean hasMonthly, int oneOffSessionCount, int upcomingSessionCount,
            Instant nextSessionAt
    ) {}

    public record OneOffBookingRow(
            long id, String bookingCode, long serviceId, String sessionName, String agenda,
            Instant startAt, Instant endAt, java.math.BigDecimal price, String currency,
            String status, int participants,
            Long reviewId, Integer reviewRating, String reviewComment
    ) {
        public OneOffBookingRow(
                long id, String bookingCode, long serviceId, String sessionName, String agenda,
                Instant startAt, Instant endAt, java.math.BigDecimal price, String currency,
                String status, int participants
        ) {
            this(id, bookingCode, serviceId, sessionName, agenda, startAt, endAt, price, currency, status, participants, null, null, null);
        }
    }

    public record MessageRow(
            long id, long senderId, String senderName, String messageType,
            String body, String codeLanguage, Instant sentAt, String clientMessageKey,
            Long fileId, String fileName, String fileMimeType, Long fileSizeBytes
    ) {}

    public record FileRow(long id, String fileName, String mimeType, long sizeBytes, byte[] content) {}
}
