package com.happyprogramming.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.happyprogramming.dto.AuthenticatedUser;
import com.happyprogramming.dto.CreateMentorshipRequest;
import com.happyprogramming.dto.CreateOneOffSessionRequest;
import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class MentorshipRequestServiceTest {
    private JdbcTemplate jdbcTemplate;
    private MentorshipRequestService service;

    @BeforeEach
    void setUp() {
        jdbcTemplate = mock(JdbcTemplate.class);
        service = new MentorshipRequestService(jdbcTemplate, mock(NotificationService.class), new ObjectMapper());
        var mentee = new AuthenticatedUser(5L, "Mentee", "mentee@example.test", "MENTEE");
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(mentee, null, List.of()));
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void rejectsMonthlyRequestWhenMentorIsUnavailable() {
        when(jdbcTemplate.queryForList(anyString(), any(Object[].class))).thenReturn(List.of());

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.create(monthlyRequest()));

        assertEquals(404, error.getStatusCode().value());
        verify(jdbcTemplate, never()).update(anyString(), any(Object[].class));
    }

    @Test
    void rejectsDuplicateActiveMonthlyRequest() {
        when(jdbcTemplate.queryForList(anyString(), any(Object[].class)))
                .thenReturn(List.of(Map.of("user_id", 8L, "full_name", "Mentor Linh")),
                        List.of(monthlyOffering()));
        when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class), any(Object[].class))).thenReturn(1);

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.create(monthlyRequest()));

        assertEquals(409, error.getStatusCode().value());
    }

    @Test
    void rejectsOneOffRequestWhenHeldSlotNoLongerBelongsToMentee() {
        when(jdbcTemplate.queryForList(anyString(), any(Object[].class)))
                .thenReturn(List.of(Map.of("user_id", 8L, "full_name", "Mentor Linh")),
                        List.of(oneOffOffering()), List.of());

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.createOneOff(oneOffRequest(1)));

        assertEquals(409, error.getStatusCode().value());
    }

    @Test
    void rejectsOneOffRequestWhenHoldDurationDoesNotMatchSessionCount() {
        Map<String, Object> hold = new HashMap<>();
        hold.put("id", 77L);
        hold.put("start_at", Timestamp.from(Instant.parse("2026-10-20T10:00:00Z")));
        hold.put("end_at", Timestamp.from(Instant.parse("2026-10-20T10:45:00Z")));
        hold.put("expires_at", Timestamp.from(Instant.parse("2026-10-20T09:55:00Z")));
        when(jdbcTemplate.queryForList(anyString(), any(Object[].class)))
                .thenReturn(List.of(Map.of("user_id", 8L, "full_name", "Mentor Linh")),
                        List.of(oneOffOffering()), List.of(hold));

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.createOneOff(oneOffRequest(2)));

        assertEquals(409, error.getStatusCode().value());
    }

    @Test
    void validatesMyBookingsPaginationAndStatusBeforeQuerying() {
        assertEquals(400, assertThrows(ResponseStatusException.class,
                () -> service.getMyApplications(-1, 10, null)).getStatusCode().value());
        assertEquals(400, assertThrows(ResponseStatusException.class,
                () -> service.getMyApplications(0, 51, null)).getStatusCode().value());
        assertEquals(400, assertThrows(ResponseStatusException.class,
                () -> service.getMyApplications(0, 10, "UNKNOWN")).getStatusCode().value());
    }

    @SuppressWarnings("unchecked")
    // 7. getMyBookings_02
    @Test
    void myBookingsFilterUsesCurrentMenteeAndRequestedStatus() {
        when(jdbcTemplate.queryForObject(anyString(), eq(Long.class), any(Object[].class))).thenReturn(0L);
        when(jdbcTemplate.query(anyString(), any(RowMapper.class), any(Object[].class))).thenReturn(List.of());

        var result = service.getMyApplications(1, 10, "accepted");

        assertEquals(0, result.applications().size());
        assertEquals(1, result.page());
        verify(jdbcTemplate).queryForObject(anyString(), eq(Long.class), eq(5L), eq("ACCEPTED"));
        verify(jdbcTemplate).query(anyString(), any(RowMapper.class),
                eq(5L), eq("ACCEPTED"), eq(10L), eq(10));
    }

    @SuppressWarnings("unchecked")
    @Test
    void myTransactionsAreAlwaysScopedToCurrentMentee() {
        when(jdbcTemplate.query(anyString(), any(RowMapper.class), any(Object[].class))).thenReturn(List.of());

        assertEquals(List.of(), service.getMyTransactions());

        verify(jdbcTemplate).query(anyString(), any(RowMapper.class), eq(5L));
    }

    private static CreateMentorshipRequest monthlyRequest() {
        return new CreateMentorshipRequest("mentor-linh",
                "I want to improve my backend skills and build a production-ready application this year.",
                "JUNIOR", "Self-taught", "Build a project", "v1", 101L);
    }

    private static CreateOneOffSessionRequest oneOffRequest(int sessions) {
        return new CreateOneOffSessionRequest("mentor-linh", 201L,
                "I need a focused review of my Spring application architecture and testing approach.",
                "JUNIOR", "v1", 77L, sessions, 1);
    }

    private static Map<String, Object> monthlyOffering() {
        Map<String, Object> row = new HashMap<>();
        row.put("id", 101L);
        row.put("name", "Lite Mentorship");
        row.put("plan_tier", "LITE");
        row.put("price", new BigDecimal("1200000.00"));
        row.put("currency", "VND");
        row.put("session_duration_minutes", 45);
        row.put("calls_per_period", 2);
        row.put("trial_days", 0);
        return row;
    }

    private static Map<String, Object> oneOffOffering() {
        Map<String, Object> row = new HashMap<>();
        row.put("id", 201L);
        row.put("name", "Code Review");
        row.put("price", new BigDecimal("180000.00"));
        row.put("currency", "VND");
        row.put("session_duration_minutes", 30);
        return row;
    }
}
