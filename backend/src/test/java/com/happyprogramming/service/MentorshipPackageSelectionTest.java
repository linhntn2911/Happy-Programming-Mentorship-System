package com.happyprogramming.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.happyprogramming.dto.AuthenticatedUser;
import com.happyprogramming.dto.CreateMentorshipRequest;
import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.PreparedStatementCreator;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class MentorshipPackageSelectionTest {
    private JdbcTemplate jdbcTemplate;
    private NotificationService notifications;
    private MentorshipRequestService service;

    @BeforeEach
    void setUp() {
        jdbcTemplate = mock(JdbcTemplate.class);
        notifications = mock(NotificationService.class);
        service = new MentorshipRequestService(jdbcTemplate, notifications, new ObjectMapper());
        var mentee = new AuthenticatedUser(5L, "Mentee", "mentee@example.test", "MENTEE");
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(mentee, null, List.of()));
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void selectedOfferingIdFreezesThatTierAndItsPrice() throws Exception {
        Map<String, Object> mentor = Map.of("user_id", 8L, "full_name", "Mentor Linh");
        Map<String, Object> lite = offering(101L, "Lite Mentorship", "LITE", "1200000.00", 11, 1);
        Map<String, Object> standard = offering(102L, "Standard Mentorship", "STANDARD", "2000000.00", 45, 2);
        when(jdbcTemplate.queryForList(anyString(), any(Object[].class)))
                .thenReturn(List.of(mentor), List.of(lite, standard));
        when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class), any(Object[].class))).thenReturn(0);
        doAnswer(invocation -> {
            PreparedStatementCreator creator = invocation.getArgument(0);
            KeyHolder holder = invocation.getArgument(1);
            Connection connection = mock(Connection.class);
            PreparedStatement statement = mock(PreparedStatement.class);
            when(connection.prepareStatement(anyString(), any(String[].class))).thenReturn(statement);
            creator.createPreparedStatement(connection);
            verify(statement).setLong(3, 101L);
            verify(statement).setString(eq(8), org.mockito.ArgumentMatchers.argThat(snapshot ->
                    snapshot.contains("\"name\":\"Lite\"") && snapshot.contains("\"price\":1200000.00")));
            holder.getKeyList().add(Map.of("id", 900L));
            return 1;
        }).when(jdbcTemplate).update(any(PreparedStatementCreator.class), any(KeyHolder.class));

        var response = service.create(request(101L));

        assertEquals(900L, response.requestId());
        verify(notifications).create(eq(8L), eq("New mentorship request"),
                eq("Mentee applied for Lite. Review it in your mentor dashboard."),
                eq("MENTORSHIP_REQUEST_RECEIVED"), eq("#/mentor/dashboard"));
    }

    @Test
    void doesNotGuessWhenMultiplePackagesExistAndClientOmitsSelection() {
        when(jdbcTemplate.queryForList(anyString(), any(Object[].class)))
                .thenReturn(List.of(Map.of("user_id", 8L, "full_name", "Mentor Linh")),
                        List.of(offering(101L, "Lite", "LITE", "1200000.00", 11, 1),
                                offering(102L, "Standard", "STANDARD", "2000000.00", 45, 2)));

        var error = assertThrows(ResponseStatusException.class, () -> service.create(request(null)));

        assertEquals(400, error.getStatusCode().value());
    }

    @Test
    void rejectsSelectedOfferingThatIsNotActiveForTheMentor() {
        when(jdbcTemplate.queryForList(anyString(), any(Object[].class)))
                .thenReturn(List.of(Map.of("user_id", 8L, "full_name", "Mentor Linh")),
                        List.of(offering(101L, "Lite", "LITE", "1200000.00", 11, 1)));

        var error = assertThrows(ResponseStatusException.class, () -> service.create(request(999L)));

        assertEquals(409, error.getStatusCode().value());
    }

    private static CreateMentorshipRequest request(Long offeringId) {
        return new CreateMentorshipRequest("mentor-linh",
                "I want to improve my backend skills and build a production-ready application this year.",
                "JUNIOR", "Self-taught", "Build a project", "v1", offeringId);
    }

    private static Map<String, Object> offering(long id, String name, String tier, String price,
                                                int minutes, int calls) {
        Map<String, Object> row = new HashMap<>();
        row.put("id", id);
        row.put("name", name);
        row.put("plan_tier", tier);
        row.put("price", new BigDecimal(price));
        row.put("currency", "VND");
        row.put("session_duration_minutes", minutes);
        row.put("calls_per_period", calls);
        row.put("trial_days", 0);
        return row;
    }
}
