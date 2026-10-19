package com.happyprogramming.service;

import com.happyprogramming.dto.AuthenticatedUser;
import com.happyprogramming.dto.StaffActivityDto;
import com.happyprogramming.dto.StaffMenteeDto;
import com.happyprogramming.dto.StaffMentorDto;
import com.happyprogramming.repository.AdminRepository;
import com.happyprogramming.repository.SkillCategoryRepository;
import com.happyprogramming.repository.SkillRepository;
import com.happyprogramming.repository.StaffRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StaffServiceTest {

    @Mock
    private StaffRepository repository;

    @Mock
    private StaffAccessService access;

    @Mock
    private SkillRepository skillRepository;

    @Mock
    private SkillCategoryRepository skillCategoryRepository;

    @Mock
    private AdminRepository adminRepository;

    @InjectMocks
    private StaffService service;

    @Test
    void shouldReturnDashboardOverviewWithRecentActivities() {
        AuthenticatedUser user = new AuthenticatedUser(10L, "Staff User", "staff@test.com", "STAFF");
        when(access.permissions(user)).thenReturn(Set.of("MENTOR_APPLICATION_MANAGE", "MENTEE_MANAGE", "MENTORSHIP_REQUEST_MANAGE"));
        when(repository.pendingApplications()).thenReturn(5L);
        when(repository.pendingRequests()).thenReturn(3L);
        when(repository.mentors()).thenReturn(List.of(
                new StaffMentorDto("1", "Mentor A", "m1@test.com", "Dev", List.of(), 5, "ACTIVE", "Bio", null, null, null)
        ));
        when(repository.mentees()).thenReturn(List.of(
                new StaffMenteeDto("2", "Mentee B", "m2@test.com", "2026-10-10", 1, "ACTIVE", true)
        ));
        when(repository.recentActivities()).thenReturn(List.of(
                new StaffActivityDto("101", "dispute", "Dispute #1 resolved", "Mentor no-show", "SUCCESS", "10m ago")
        ));

        Map<String, Object> result = service.getDashboardOverview(user);

        assertNotNull(result);
        assertEquals(5L, result.get("pendingApplicationsCount"));
        assertEquals(1L, result.get("activeMentorsCount"));
        assertEquals(1L, result.get("activeMenteesCount"));
        assertEquals(3L, result.get("pendingRequestsCount"));
        @SuppressWarnings("unchecked")
        List<StaffActivityDto> activities = (List<StaffActivityDto>) result.get("recentActivities");
        assertNotNull(activities);
        assertEquals(1, activities.size());
        assertEquals("Dispute #1 resolved", activities.get(0).getTitle());
    }
}
