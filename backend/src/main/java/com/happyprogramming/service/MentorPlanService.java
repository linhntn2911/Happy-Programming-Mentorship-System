package com.happyprogramming.service;

import com.happyprogramming.dto.MentorPlanRequest;
import com.happyprogramming.dto.MentorPlanResponse;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
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
            SELECT id, name, service_type, description, price, currency,
                   session_duration_minutes, calls_per_period, trial_days,
                   response_time_hours, chat_included, status
            FROM dbo.service_offerings
            WHERE mentor_id = ?
            ORDER BY display_order, id
            """;

    private static final String COUNT_MONTHLY = """
            SELECT COUNT(1) FROM dbo.service_offerings
            WHERE mentor_id = ? AND service_type = 'MONTHLY'
            """;

    private static final String UPDATE_MONTHLY = """
            UPDATE dbo.service_offerings
            SET name = ?, description = ?, price = ?, session_duration_minutes = ?,
                calls_per_period = ?, trial_days = ?, response_time_hours = ?, status = ?,
                updated_at = SYSUTCDATETIME()
            WHERE mentor_id = ? AND service_type = 'MONTHLY'
            """;

    private static final String INSERT_MONTHLY = """
            INSERT INTO dbo.service_offerings
                (mentor_id, name, service_type, description, price, currency,
                 session_duration_minutes, calls_per_period, chat_included,
                 response_time_hours, trial_days, benefits, status, display_order,
                 created_at, updated_at)
            VALUES
                (?, ?, 'MONTHLY', ?, ?, 'VND', ?, ?, 1, ?, ?, N'[]', ?, 0,
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

    @Transactional
    public MentorPlanResponse saveMonthlyPlan(MentorPlanRequest request) {
        long mentorId = mentorService.currentActiveMentorUserId();
        JdbcTemplate template = jdbc();

        String name = request.name().trim();
        String description = request.description().trim();
        BigDecimal price = request.price().setScale(2, RoundingMode.HALF_UP);
        int minutes = request.sessionDurationMinutes();
        int calls = request.callsPerPeriod();
        int trialDays = request.trialDays() != null ? request.trialDays() : DEFAULT_TRIAL_DAYS;
        int responseTimeHours =
                request.responseTimeHours() != null ? request.responseTimeHours() : DEFAULT_RESPONSE_TIME_HOURS;
        String status = request.status() == null || request.status().isBlank() ? "ACTIVE" : request.status();

        Integer existing = template.queryForObject(COUNT_MONTHLY, Integer.class, mentorId);
        if (existing != null && existing > 0) {
            template.update(UPDATE_MONTHLY, name, description, price, minutes, calls,
                    trialDays, responseTimeHours, status, mentorId);
        } else {
            template.update(INSERT_MONTHLY, mentorId, name, description, price, minutes, calls,
                    responseTimeHours, trialDays, status);
        }

        return template.query(SELECT_PLANS, planRowMapper(), mentorId).stream()
                .filter(plan -> "MONTHLY".equals(plan.serviceType()))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.INTERNAL_SERVER_ERROR, "Saved package could not be reloaded."));
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
