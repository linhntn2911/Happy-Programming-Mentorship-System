package com.happyprogramming.repository;

import com.happyprogramming.dto.MentorAvailabilitySlotResponse;
import com.happyprogramming.dto.PublicAvailabilitySlotResponse;
import com.happyprogramming.dto.SlotHoldResponse;

import java.sql.PreparedStatement;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;
import org.springframework.web.server.ResponseStatusException;

/**
 * Persistence for the in-app mentor availability and slot-hold feature. Timestamps are stored as
 * UTC in DATETIME2 columns; {@link Instant} values are converted to/from {@link LocalDateTime} at
 * the UTC offset so the round trip never depends on the JVM default timezone.
 */
@Repository
public class MentorAvailabilityRepository {
    private static final String SELECT_UPCOMING_SLOTS = """
            SELECT id, start_at, end_at, reason, created_at
            FROM dbo.availability_exceptions
            WHERE mentor_id = ? AND exception_type = 'EXTRA_AVAILABLE' AND start_at >= SYSUTCDATETIME()
            ORDER BY start_at, id
            """;

    private static final String COUNT_OVERLAPPING_SLOTS = """
            SELECT COUNT(1) FROM dbo.availability_exceptions
            WHERE mentor_id = ? AND exception_type = 'EXTRA_AVAILABLE' AND start_at < ? AND end_at > ?
            """;

    private static final String INSERT_SLOT = """
            INSERT INTO dbo.availability_exceptions
                (mentor_id, start_at, end_at, exception_type, source, reason, created_at, updated_at)
            VALUES
                (?, ?, ?, 'EXTRA_AVAILABLE', 'MANUAL', ?, SYSUTCDATETIME(), SYSUTCDATETIME())
            """;

    private static final String DELETE_SLOT = """
            DELETE FROM dbo.availability_exceptions
            WHERE id = ? AND mentor_id = ? AND exception_type = 'EXTRA_AVAILABLE'
            """;

    private static final String SELECT_SLOT_BY_ID = """
            SELECT id, start_at, end_at, reason, created_at
            FROM dbo.availability_exceptions
            WHERE id = ? AND mentor_id = ? AND exception_type = 'EXTRA_AVAILABLE'
            """;

    private static final String RESOLVE_MENTOR_ID_BY_SLUG = """
            SELECT user_id FROM dbo.mentor_profiles WHERE slug = ?
            """;

    private static final String SELECT_PUBLIC_SLOTS = """
            SELECT ae.id, ae.start_at, ae.end_at,
                   CASE WHEN EXISTS (
                        SELECT 1 FROM dbo.slot_holds sh
                        WHERE sh.mentor_id = ae.mentor_id AND sh.status IN ('HELD', 'CONVERTED')
                          AND sh.start_at < ae.end_at AND sh.end_at > ae.start_at
                   ) THEN 0 ELSE 1 END AS available
            FROM dbo.availability_exceptions ae
            JOIN dbo.mentor_profiles mp ON mp.user_id = ae.mentor_id
            JOIN dbo.users u ON u.id = ae.mentor_id
            WHERE ae.mentor_id = ? AND ae.exception_type = 'EXTRA_AVAILABLE'
              AND mp.is_public = 1 AND u.status = 'ACTIVE'
              AND ae.start_at >= ? AND ae.start_at <= ?
            ORDER BY ae.start_at, ae.id
            """;

    private static final String SELECT_PUBLIC_MENTOR_BY_SLUG = """
            SELECT TOP 1 mp.user_id, u.full_name
            FROM dbo.mentor_profiles mp
            JOIN dbo.users u ON u.id = mp.user_id
            WHERE mp.slug = ? AND mp.is_public = 1 AND u.status = 'ACTIVE'
            """;

    private static final String SELECT_ACTIVE_ONE_OFF_OFFERING = """
            SELECT id, name, session_duration_minutes
            FROM dbo.service_offerings
            WHERE id = ? AND mentor_id = ? AND service_type = 'ONE_OFF' AND status = 'ACTIVE'
            """;

    private static final String COUNT_COVERING_SLOTS = """
            SELECT COUNT(1) FROM dbo.availability_exceptions
            WHERE mentor_id = ? AND exception_type = 'EXTRA_AVAILABLE' AND start_at <= ? AND end_at >= ?
            """;

    private static final String COUNT_OVERLAPPING_HOLDS = """
            SELECT COUNT(1) FROM dbo.slot_holds WITH (HOLDLOCK, UPDLOCK)
            WHERE mentor_id = ? AND status IN ('HELD', 'CONVERTED') AND start_at < ? AND end_at > ?
            """;

    private static final String INSERT_HOLD = """
            INSERT INTO dbo.slot_holds
                (mentor_id, mentee_id, service_id, service_type, start_at, end_at, expires_at,
                 status, created_at, updated_at)
            VALUES
                (?, ?, ?, 'ONE_OFF', ?, ?, DATEADD(MINUTE, ?, SYSUTCDATETIME()),
                 'HELD', SYSUTCDATETIME(), SYSUTCDATETIME())
            """;

    private static final String SELECT_HOLD = """
            SELECT id, mentor_id, service_id, start_at, end_at, expires_at, status
            FROM dbo.slot_holds WHERE id = ?
            """;

    private static final String RELEASE_HOLD = """
            UPDATE dbo.slot_holds
            SET status = 'RELEASED', updated_at = SYSUTCDATETIME()
            WHERE id = ? AND mentee_id = ? AND status = 'HELD'
            """;

    private static final String EXPIRE_OVERDUE_HOLDS = """
            UPDATE dbo.slot_holds
            SET status = 'EXPIRED', updated_at = SYSUTCDATETIME()
            WHERE status = 'HELD' AND expires_at <= SYSUTCDATETIME()
            """;

    private final JdbcTemplate jdbcTemplate;

    public MentorAvailabilityRepository(@Autowired(required = false) JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<MentorAvailabilitySlotResponse> findUpcomingSlots(long mentorId) {
        return jdbc().query(SELECT_UPCOMING_SLOTS, slotMapper(), mentorId);
    }

    public boolean existsOverlappingSlot(long mentorId, Instant startAt, Instant endAt) {
        Integer count = jdbc().queryForObject(
                COUNT_OVERLAPPING_SLOTS, Integer.class, mentorId, toUtc(endAt), toUtc(startAt));
        return count != null && count > 0;
    }

    public long insertSlot(long mentorId, Instant startAt, Instant endAt, String reason) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbc().update(connection -> {
            PreparedStatement ps = connection.prepareStatement(INSERT_SLOT, new String[] {"id"});
            ps.setLong(1, mentorId);
            ps.setObject(2, toUtc(startAt));
            ps.setObject(3, toUtc(endAt));
            ps.setString(4, reason);
            return ps;
        }, keyHolder);
        Number key = keyHolder.getKey();
        if (key == null) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Availability slot could not be created.");
        }
        return key.longValue();
    }

    public int deleteSlot(long slotId, long mentorId) {
        return jdbc().update(DELETE_SLOT, slotId, mentorId);
    }

    public MentorAvailabilitySlotResponse findSlotForMentor(long slotId, long mentorId) {
        List<MentorAvailabilitySlotResponse> rows = jdbc().query(SELECT_SLOT_BY_ID, slotMapper(), slotId, mentorId);
        return rows.isEmpty() ? null : rows.get(0);
    }

    public Long resolveMentorId(String identifier) {
        if (identifier.chars().allMatch(Character::isDigit)) {
            try {
                long parsed = Long.parseLong(identifier);
                return parsed > 0 ? parsed : null;
            } catch (NumberFormatException ex) {
                return null;
            }
        }
        List<Long> ids = jdbc().queryForList(RESOLVE_MENTOR_ID_BY_SLUG, Long.class, identifier);
        return ids.isEmpty() ? null : ids.get(0);
    }

    public List<PublicAvailabilitySlotResponse> findPublicSlots(long mentorId, Instant from, Instant to) {
        return jdbc().query(SELECT_PUBLIC_SLOTS, publicSlotMapper(), mentorId, toUtc(from), toUtc(to));
    }

    public Map<String, Object> findPublicMentorBySlug(String slug) {
        List<Map<String, Object>> rows = jdbc().queryForList(SELECT_PUBLIC_MENTOR_BY_SLUG, slug);
        return rows.isEmpty() ? null : rows.get(0);
    }

    public Map<String, Object> findActiveOneOffOffering(long offeringId, long mentorId) {
        List<Map<String, Object>> rows = jdbc().queryForList(SELECT_ACTIVE_ONE_OFF_OFFERING, offeringId, mentorId);
        return rows.isEmpty() ? null : rows.get(0);
    }

    public boolean isWithinOpenSlot(long mentorId, Instant startAt, Instant endAt) {
        Integer count = jdbc().queryForObject(
                COUNT_COVERING_SLOTS, Integer.class, mentorId, toUtc(startAt), toUtc(endAt));
        return count != null && count > 0;
    }

    public boolean existsOverlappingHold(long mentorId, Instant startAt, Instant endAt) {
        Integer count = jdbc().queryForObject(
                COUNT_OVERLAPPING_HOLDS, Integer.class, mentorId, toUtc(endAt), toUtc(startAt));
        return count != null && count > 0;
    }

    public long insertHold(long mentorId, long menteeId, long serviceId, Instant startAt, Instant endAt, int holdMinutes) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbc().update(connection -> {
            PreparedStatement ps = connection.prepareStatement(INSERT_HOLD, new String[] {"id"});
            ps.setLong(1, mentorId);
            ps.setLong(2, menteeId);
            ps.setLong(3, serviceId);
            ps.setObject(4, toUtc(startAt));
            ps.setObject(5, toUtc(endAt));
            ps.setInt(6, holdMinutes);
            return ps;
        }, keyHolder);
        Number key = keyHolder.getKey();
        if (key == null) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Slot hold could not be created.");
        }
        return key.longValue();
    }

    public SlotHoldResponse findHold(long holdId) {
        List<SlotHoldResponse> rows = jdbc().query(SELECT_HOLD, holdMapper(), holdId);
        return rows.isEmpty() ? null : rows.get(0);
    }

    public int releaseHold(long holdId, long menteeId) {
        return jdbc().update(RELEASE_HOLD, holdId, menteeId);
    }

    public int expireOverdueHolds() {
        if (jdbcTemplate == null) {
            return 0;
        }
        return jdbcTemplate.update(EXPIRE_OVERDUE_HOLDS);
    }

    private JdbcTemplate jdbc() {
        if (jdbcTemplate == null) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE, "Availability storage is temporarily unavailable.");
        }
        return jdbcTemplate;
    }

    private static RowMapper<MentorAvailabilitySlotResponse> slotMapper() {
        return (rs, rowNum) -> new MentorAvailabilitySlotResponse(
                rs.getLong("id"),
                fromUtc(rs.getObject("start_at", LocalDateTime.class)),
                fromUtc(rs.getObject("end_at", LocalDateTime.class)),
                rs.getString("reason"),
                fromUtc(rs.getObject("created_at", LocalDateTime.class)));
    }

    private static RowMapper<PublicAvailabilitySlotResponse> publicSlotMapper() {
        return (rs, rowNum) -> new PublicAvailabilitySlotResponse(
                rs.getLong("id"),
                fromUtc(rs.getObject("start_at", LocalDateTime.class)),
                fromUtc(rs.getObject("end_at", LocalDateTime.class)),
                rs.getBoolean("available"));
    }

    private static RowMapper<SlotHoldResponse> holdMapper() {
        return (rs, rowNum) -> new SlotHoldResponse(
                rs.getLong("id"),
                rs.getLong("mentor_id"),
                rs.getLong("service_id"),
                fromUtc(rs.getObject("start_at", LocalDateTime.class)),
                fromUtc(rs.getObject("end_at", LocalDateTime.class)),
                fromUtc(rs.getObject("expires_at", LocalDateTime.class)),
                rs.getString("status"));
    }

    private static LocalDateTime toUtc(Instant instant) {
        return instant == null ? null : LocalDateTime.ofInstant(instant, ZoneOffset.UTC);
    }

    private static Instant fromUtc(LocalDateTime dateTime) {
        return dateTime == null ? null : dateTime.toInstant(ZoneOffset.UTC);
    }
}
