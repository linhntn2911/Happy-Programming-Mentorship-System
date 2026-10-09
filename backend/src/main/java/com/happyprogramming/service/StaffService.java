package com.happyprogramming.service;

import com.happyprogramming.dto.AuthenticatedUser;
import com.happyprogramming.dto.SkillDtos;
import com.happyprogramming.dto.StaffMenteeDto;
import com.happyprogramming.dto.StaffMentorDto;
import com.happyprogramming.dto.StaffReadDtos;
import com.happyprogramming.entity.Skill;
import com.happyprogramming.repository.AdminRepository;
import com.happyprogramming.repository.SkillCategoryRepository;
import com.happyprogramming.repository.SkillRepository;
import com.happyprogramming.repository.StaffRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;

@Service
@Transactional(readOnly = true)
public class StaffService {
    private final StaffRepository repository;
    private final StaffAccessService access;
    private final SkillRepository skillRepository;
    private final SkillCategoryRepository skillCategoryRepository;
    private final AdminRepository adminRepository;

    public StaffService(StaffRepository repository, StaffAccessService access,
                        SkillRepository skillRepository, SkillCategoryRepository skillCategoryRepository,
                        AdminRepository adminRepository) {
        this.repository = repository;
        this.access = access;
        this.skillRepository = skillRepository;
        this.skillCategoryRepository = skillCategoryRepository;
        this.adminRepository = adminRepository;
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
    public List<StaffReadDtos.SkillCategory> getSkillCategories() { return repository.skillCategories(); }
    public List<StaffReadDtos.Request> getRequests() { return repository.requests(); }

    @Transactional
    public StaffReadDtos.Skill createSkill(SkillDtos.CreateSkillRequest request, AuthenticatedUser user) {
        requireSkillPermission(user);
        String name = request.name().trim();
        if (skillRepository.existsByNameIgnoreCase(name)) {
            throw new IllegalArgumentException("A skill with name '" + name + "' already exists.");
        }
        if (!skillCategoryRepository.existsById(request.categoryId())) {
            throw new IllegalArgumentException("Selected skill category does not exist.");
        }

        String slug = generateSlug(name);
        Skill skill = new Skill();
        skill.setName(name);
        skill.setSlug(slug);
        skill.setCategoryId(request.categoryId());
        skill.setDescription(request.description() != null ? request.description().trim() : null);
        skill.setActive(request.active() == null || request.active());
        if (user != null && user.id() != null) skill.setCreatedBy(user.id());

        skill = skillRepository.save(skill);
        adminRepository.audit(user != null ? user.id() : 0L, "CREATE_SKILL", "skills", String.valueOf(skill.getId()),
            null, Map.of("name", name, "category", request.categoryId(), "active", skill.isActive()),
            "Created technical skill", "127.0.0.1");

        final long createdId = skill.getId();
        return getSkills().stream().filter(s -> s.id() == createdId).findFirst().orElseThrow();
    }

    @Transactional
    public StaffReadDtos.Skill updateSkill(Long id, SkillDtos.UpdateSkillRequest request, AuthenticatedUser user) {
        requireSkillPermission(user);
        Skill skill = skillRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Skill not found with ID: " + id));

        String name = request.name().trim();
        if (skillRepository.existsByNameIgnoreCaseAndIdNot(name, id)) {
            throw new IllegalArgumentException("Another skill with name '" + name + "' already exists.");
        }
        if (!skillCategoryRepository.existsById(request.categoryId())) {
            throw new IllegalArgumentException("Selected skill category does not exist.");
        }

        String before = skill.getName() + " (" + skill.getCategoryId() + ", active=" + skill.isActive() + ")";
        skill.setName(name);
        skill.setSlug(generateSlug(name));
        skill.setCategoryId(request.categoryId());
        skill.setDescription(request.description() != null ? request.description().trim() : null);
        if (request.active() != null) skill.setActive(request.active());

        skill = skillRepository.save(skill);
        adminRepository.audit(user != null ? user.id() : 0L, "UPDATE_SKILL", "skills", String.valueOf(skill.getId()),
            before, Map.of("name", name, "category", request.categoryId(), "active", skill.isActive()),
            "Updated technical skill", "127.0.0.1");

        final long updatedId = skill.getId();
        return getSkills().stream().filter(s -> s.id() == updatedId).findFirst().orElseThrow();
    }

    @Transactional
    public StaffReadDtos.Skill toggleSkillStatus(Long id, Boolean active, AuthenticatedUser user) {
        requireSkillPermission(user);
        Skill skill = skillRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Skill not found with ID: " + id));

        boolean newActive = active != null ? active : !skill.isActive();
        skill.setActive(newActive);
        skillRepository.save(skill);

        adminRepository.audit(user != null ? user.id() : 0L, "TOGGLE_SKILL_STATUS", "skills", String.valueOf(id),
            !newActive, newActive, "Toggled skill active status to " + newActive, "127.0.0.1");

        return getSkills().stream().filter(s -> s.id() == id).findFirst().orElseThrow();
    }

    private void requireSkillPermission(AuthenticatedUser user) {
        var permissions = access.permissions(user);
        if (!permissions.contains("SKILL_MANAGE")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Missing SKILL_MANAGE permission.");
        }
    }

    private static String generateSlug(String text) {
        if (text == null) return "";
        return text.trim().toLowerCase(Locale.ROOT)
            .replaceAll("[^a-z0-9]+", "-")
            .replaceAll("^-|-$", "");
    }
}
