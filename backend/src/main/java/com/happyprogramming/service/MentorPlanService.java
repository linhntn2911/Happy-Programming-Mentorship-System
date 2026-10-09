package com.happyprogramming.service;

import com.happyprogramming.dto.MentorPlanRequest;
import com.happyprogramming.dto.MentorPlanResponse;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class MentorPlanService {
    private static final int DEFAULT_TRIAL_DAYS = 7;
    private static final int DEFAULT_RESPONSE_TIME_HOURS = 24;

    private static final String SELECT_PLANS = """
            SELECT id, name, service_type, plan_tier, description, price, currency,
                   session_duration_minutes, calls_per_period, trial_days,
                   response_time_hours, chat_included, status
            FROM dbo.service_offerings
            WHERE mentor_id = ?
            ORDER BY CASE plan_tier WHEN 'LITE' THEN 0 WHEN 'STANDARD' THEN 1 WHEN 'PRO' THEN 2 ELSE 3 END,
                     display_order, id
            """;

    private static final String RESOLVE_MENTOR_ID_BY_SLUG = """
            SELECT user_id FROM dbo.mentor_profiles WHERE slug = ?
            """;

    private static final String SELECT_PUBLIC_PLANS = """
            SELECT so.id, so.name, so.service_type, so.plan_tier, so.description, so.price, so.currency,
                   so.session_duration_minutes, so.calls_per_period, so.trial_days,
                   so.response_time_hours, so.chat_included, so.status
            FROM dbo.service_offerings so
            JOIN dbo.mentor_profiles mp ON mp.user_id = so.mentor_id
            JOIN dbo.users u ON u.id = so.mentor_id
            WHERE so.mentor_id = ? AND so.service_type = 'MONTHLY' AND so.status = 'ACTIVE'
              AND mp.is_public = 1 AND u.status = 'ACTIVE'
            ORDER BY CASE so.plan_tier WHEN 'LITE' THEN 0 WHEN 'STANDARD' THEN 1 WHEN 'PRO' THEN 2 ELSE 3 END,
                     so.display_order, so.id
            """;

    private static final String COUNT_TIER = """
            SELECT COUNT(1) FROM dbo.service_offerings
            WHERE mentor_id = ? AND service_type = 'MONTHLY' AND plan_tier = ?
            """;

    private static final String UPDATE_TIER = """
            UPDATE dbo.service_offerings
            SET name = ?, description = ?, price = ?, session_duration_minutes = ?,
                calls_per_period = ?, trial_days = ?, response_time_hours = ?, status = ?,
                display_order = ?, updated_at = SYSUTCDATETIME()
            WHERE mentor_id = ? AND service_type = 'MONTHLY' AND plan_tier = ?
            """;

    private static final String INSERT_TIER = """
            INSERT INTO dbo.service_offerings
                (mentor_id, name, service_type, plan_tier, description, price, currency,
                 session_duration_minutes, calls_per_period, chat_included,
                 response_time_hours, trial_days, benefits, status, display_order,
                 created_at, updated_at)
            VALUES
                (?, ?, 'MONTHLY', ?, ?, ?, 'VND', ?, ?, 1, ?, ?, N'[]', ?, ?,
                 SYSUTCDATETIME(), SYSUTCDATETIME())
            """;

    private final MentorService mentorService;
    private final JdbcTemplate jdbcTemplate;

    public MentorPlanService(
            MentorService mentorService,
            @Autowired(required = false) JdbcTemplate jdbcTemplate) {
        this.mentorService = mentorService;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional(readOnly = true)
    public List<MentorPlanResponse> getMyPlans() {
        long mentorId = mentorService.currentActiveMentorUserId();
        return jdbc().query(SELECT_PLANS, planRowMapper(), mentorId);
    }

    @Transactional(readOnly = true)
    public List<MentorPlanResponse> getPublicPlans(String identifier) {
        if (identifier == null || identifier.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A valid mentor identifier is required.");
        }
        Long mentorId = resolveMentorId(identifier.trim());
        if (mentorId == null) {
            return List.of();
        }
        return jdbc().query(SELECT_PUBLIC_PLANS, planRowMapper(), mentorId);
    }

    private Long resolveMentorId(String identifier) {
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

    @Transactional
    public List<MentorPlanResponse> savePlans(List<MentorPlanRequest> requests) {
        long mentorId = mentorService.currentActiveMentorUserId();
        JdbcTemplate template = jdbc();
        if (requests == null || requests.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Provide at least one package to save.");
        }
        if (requests.size() > 3) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A mentor may configure at most three packages.");
        }

        Set<String> seenTiers = new HashSet<>();
        for (MentorPlanRequest request : requests) {
            String tier = normalizeTier(request.planTier());
            if (!seenTiers.add(tier)) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST, "Duplicate package tier: " + tier + ".");
            }
            upsertTier(template, mentorId, tier, request);
        }

        return template.query(SELECT_PLANS, planRowMapper(), mentorId);
    }

    private void upsertTier(JdbcTemplate template, long mentorId, String tier, MentorPlanRequest request) {
        String name = request.name() == null || request.name().isBlank()
                ? defaultNameForTier(tier)
                : request.name().trim();
        String description = request.description().trim();
        BigDecimal price = request.price().setScale(2, RoundingMode.HALF_UP);
        int minutes = request.sessionDurationMinutes();
        int calls = request.callsPerPeriod();
        int trialDays = request.trialDays() != null ? request.trialDays() : DEFAULT_TRIAL_DAYS;
        int responseTimeHours =
                request.responseTimeHours() != null ? request.responseTimeHours() : DEFAULT_RESPONSE_TIME_HOURS;
        String status = request.status() == null || request.status().isBlank() ? "ACTIVE" : request.status();
        int displayOrder = tierRank(tier);

        Integer existing = template.queryForObject(COUNT_TIER, Integer.class, mentorId, tier);
        if (existing != null && existing > 0) {
            template.update(UPDATE_TIER, name, description, price, minutes, calls,
                    trialDays, responseTimeHours, status, displayOrder, mentorId, tier);
        } else {
            template.update(INSERT_TIER, mentorId, name, tier, description, price, minutes, calls,
                    responseTimeHours, trialDays, status, displayOrder);
        }
    }

    private static String normalizeTier(String tier) {
        if (tier == null || tier.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Package tier is required.");
        }
        String normalized = tier.trim().toUpperCase(Locale.ROOT);
        if (!normalized.equals("LITE") && !normalized.equals("STANDARD") && !normalized.equals("PRO")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Package tier must be LITE, STANDARD or PRO.");
        }
        return normalized;
    }

    private static int tierRank(String tier) {
        return switch (tier) {
            case "LITE" -> 0;
            case "STANDARD" -> 1;
            default -> 2;
        };
    }

    private static String defaultNameForTier(String tier) {
        return switch (tier) {
            case "LITE" -> "Lite Mentorship";
            case "PRO" -> "Pro Mentorship";
            default -> "Standard Mentorship";
        };
    }

    private JdbcTemplate jdbc() {
        if (jdbcTemplate == null) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE, "Mentor package storage is not available.");
        }
        return jdbcTemplate;
    }

    private static RowMapper<MentorPlanResponse> planRowMapper() {
        return (ResultSet rs, int rowNum) -> new MentorPlanResponse(
                rs.getLong("id"),
                rs.getString("name"),
                rs.getString("service_type"),
                rs.getString("plan_tier"),
                rs.getString("description"),
                rs.getBigDecimal("price"),
                rs.getString("currency"),
                rs.getInt("session_duration_minutes"),
                nullableInt(rs, "calls_per_period"),
                rs.getInt("trial_days"),
                nullableInt(rs, "response_time_hours"),
                rs.getBoolean("chat_included"),
                rs.getString("status"));
    }

    private static Integer nullableInt(ResultSet rs, String column) throws SQLException {
        int value = rs.getInt(column);
        return rs.wasNull() ? null : value;
    }
}
