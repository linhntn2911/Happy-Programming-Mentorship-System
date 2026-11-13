package com.happyprogramming.service;

import com.happyprogramming.dto.MentorPlanRequest;
import com.happyprogramming.dto.MentorPlanResponse;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class MentorPlanServiceTest {
    private MentorService mentorService;
    private JdbcTemplate jdbcTemplate;
    private MentorPlanService service;

    @BeforeEach
    void setUp() {
        mentorService = mock(MentorService.class);
        jdbcTemplate = mock(JdbcTemplate.class);
        service = new MentorPlanService(mentorService, jdbcTemplate);
        when(mentorService.currentActiveMentorUserId()).thenReturn(7L);
    }

    @Test
    @SuppressWarnings("unchecked")
    void savePlansDeactivatesUncheckedTiersBeforeSavingEnabledTiers() {
        var standard = new MentorPlanRequest(
                "STANDARD", null, new BigDecimal("1002000"), 60, 3,
                "Monthly guidance with regular calls.", null, null, "ACTIVE");
        var saved = new MentorPlanResponse(
                12L, "Standard Mentorship", "MONTHLY", "STANDARD",
                standard.description(), standard.price(), "VND", 60, 3,
                7, 24, true, "ACTIVE");

        when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class), any(Object[].class)))
                .thenReturn(1);
        when(jdbcTemplate.query(anyString(), any(RowMapper.class), any(Object[].class)))
                .thenReturn(List.of(saved));

        var result = service.savePlans(List.of(standard));

        verify(jdbcTemplate).update(
                argThat(sql -> sql.contains("SET status = 'INACTIVE'") && sql.contains("service_type = 'MONTHLY'")),
                eq(7L));
        assertEquals(1, result.size());
        assertEquals("STANDARD", result.get(0).planTier());
    }
}
