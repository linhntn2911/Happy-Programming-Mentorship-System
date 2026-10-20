package com.happyprogramming.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.happyprogramming.dto.AuthenticatedUser;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class MentorshipRequestCancellationTest {
    private JdbcTemplate jdbcTemplate;
    private NotificationService notificationService;
    private MentorshipRequestService service;

    @BeforeEach
    void setUp() {
        jdbcTemplate = mock(JdbcTemplate.class);
        notificationService = mock(NotificationService.class);
        service = new MentorshipRequestService(jdbcTemplate, notificationService, new ObjectMapper());
        var user = new AuthenticatedUser(5L, "Mentee", "mentee@example.test", "MENTEE");
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user, null, List.of()));
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    // 15. cancelRequest_01
    @Test
    void cancelsOwnedAcceptedApplicationWithoutSucceededPaymentAndNotifiesMentor() {
        Map<String, Object> request = new HashMap<>();
        request.put("mentee_id", 5L);
        request.put("mentor_id", 8L);
        request.put("status", "ACCEPTED");
        request.put("funded_at", null);
        when(jdbcTemplate.queryForList(anyString(), any(Object[].class))).thenReturn(List.of(request));
        when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class), any(Object[].class))).thenReturn(0);

        service.cancelMyRequest(99L);

        verify(jdbcTemplate, atLeastOnce()).update(anyString(), any(Object[].class));
        verify(notificationService).create(eq(8L), eq("Mentorship application cancelled"),
                eq("Mentee cancelled their mentorship application."), eq("MENTORSHIP_REQUEST_CANCELLED"),
                eq("#/mentor/dashboard"));
    }

    // 16. cancelRequest_02
    @Test
    void refusesCancellationWhenPaymentIsSucceeded() {
        Map<String, Object> request = new HashMap<>();
        request.put("mentee_id", 5L);
        request.put("mentor_id", 8L);
        request.put("status", "ACCEPTED");
        request.put("funded_at", null);
        when(jdbcTemplate.queryForList(anyString(), any(Object[].class))).thenReturn(List.of(request));
        when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class), any(Object[].class))).thenReturn(1);

        assertThrows(ResponseStatusException.class, () -> service.cancelMyRequest(99L));

        verify(jdbcTemplate, never()).update(anyString(), any(Object[].class));
    }

    @Test
    void refusesCancellationOwnedByAnotherMentee() {
        Map<String, Object> request = new HashMap<>();
        request.put("mentee_id", 55L);
        request.put("mentor_id", 8L);
        request.put("status", "PENDING");
        request.put("funded_at", null);
        when(jdbcTemplate.queryForList(anyString(), any(Object[].class))).thenReturn(List.of(request));

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.cancelMyRequest(99L));

        assertEquals(403, error.getStatusCode().value());
        verify(jdbcTemplate, never()).update(anyString(), any(Object[].class));
    }

    @Test
    void refusesCancellationAfterApplicationLeavesCancellableStates() {
        Map<String, Object> request = new HashMap<>();
        request.put("mentee_id", 5L);
        request.put("mentor_id", 8L);
        request.put("status", "DECLINED");
        request.put("funded_at", null);
        when(jdbcTemplate.queryForList(anyString(), any(Object[].class))).thenReturn(List.of(request));

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.cancelMyRequest(99L));

        assertEquals(409, error.getStatusCode().value());
        verify(jdbcTemplate, never()).update(anyString(), any(Object[].class));
    }
}
