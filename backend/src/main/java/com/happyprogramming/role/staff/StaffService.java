package com.happyprogramming.role.staff;

import com.happyprogramming.role.auth.AuthenticatedUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;

@Service
@Transactional(readOnly = true)
public class StaffService {
    private final StaffRepository repository;
    private final StaffAccessService access;

    public StaffService(StaffRepository repository, StaffAccessService access) {
        this.repository = repository;
        this.access = access;
    }

    public Map<String, Object> getDashboardOverview(AuthenticatedUser user) {
        var p = access.permissions(user);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("pendingApplicationsCount", p.contains("MENTOR_APPLICATION_MANAGE") ? repository.pendingApplications() : null);
        result.put("activeMentorsCount", p.contains("MENTOR_APPLICATION_MANAGE") ? getMentors().stream().filter(m -> "ACTIVE".equals(m.getStatus())).count() : null);
        result.put("activeMenteesCount", p.contains("MENTEE_MANAGE") ? getMentees().stream().filter(m -> "ACTIVE".equals(m.getStatus())).count() : null);
        result.put("pendingRequestsCount", p.contains("MENTORSHIP_REQUEST_MANAGE") ? repository.pendingRequests() : null);
        result.put("recentActivities", List.of());
        return result;
    }

    public List<StaffMentorDto> getMentors() { return repository.mentors(); }
    public List<StaffMenteeDto> getMentees() { return repository.mentees(); }
    public List<StaffReadDtos.Skill> getSkills() { return repository.skills(); }
    public List<StaffReadDtos.Request> getRequests() { return repository.requests(); }
}
