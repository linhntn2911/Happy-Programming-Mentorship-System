package com.happyprogramming.service;

import com.happyprogramming.dto.MentorProfileRequest;
import com.happyprogramming.dto.MentorProfileResponse;
import com.happyprogramming.dto.MentorSkillResponse;
import com.happyprogramming.dto.SkillTagResponse;
import com.happyprogramming.entity.MentorAccount;
import com.happyprogramming.entity.MentorProfile;
import com.happyprogramming.entity.MentorSkill;
import com.happyprogramming.entity.Skill;
import com.happyprogramming.repository.MentorAccountRepository;
import com.happyprogramming.repository.MentorProfileRepository;
import com.happyprogramming.repository.MentorSkillRepository;
import com.happyprogramming.repository.SkillRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class MentorService {
    private static final int MAX_SKILL_SELECTIONS = 100;

    private final MentorAccountRepository accountRepository;
    private final MentorProfileRepository profileRepository;
    private final SkillRepository skillRepository;
    private final MentorSkillRepository mentorSkillRepository;
    private final boolean demoIdentityEnabled;
    private final String configuredDemoUserId;

    public MentorService(
            MentorAccountRepository accountRepository,
            MentorProfileRepository profileRepository,
            SkillRepository skillRepository,
            MentorSkillRepository mentorSkillRepository,
            @Value("${hpms.mentor.demo.enabled:false}") boolean demoIdentityEnabled,
            @Value("${hpms.mentor.demo.user-id:}") String configuredDemoUserId) {
        this.accountRepository = accountRepository;
        this.profileRepository = profileRepository;
        this.skillRepository = skillRepository;
        this.mentorSkillRepository = mentorSkillRepository;
        this.demoIdentityEnabled = demoIdentityEnabled;
        this.configuredDemoUserId = configuredDemoUserId;
    }

    @Transactional(readOnly = true)
    public MentorProfileResponse getMyProfile() {
        long userId = resolveDemoUserId();
        MentorAccount account = getActiveMentorAccount(userId);
        MentorProfile profile = getMentorProfile(userId);
        return toResponse(account, profile, mentorSkillRepository.findActiveSkillsByMentorId(userId));
    }

    @Transactional
    public MentorProfileResponse updateMyProfile(MentorProfileRequest request) {
        long userId = resolveDemoUserId();
        validateRequest(request);
        MentorAccount account = getActiveMentorAccount(userId);
        MentorProfile profile = getMentorProfile(userId);

        List<Long> requestedIds = request.skillIds();
        List<Skill> activeSkills =
                skillRepository.findAllByActiveTrueAndIdInOrderByNameAsc(requestedIds);
        Map<Long, Skill> activeSkillsById = new HashMap<>();
        for (Skill skill : activeSkills) {
            activeSkillsById.put(skill.getId(), skill);
        }
        if (activeSkillsById.size() != requestedIds.size()) {
            throw badRequest("Every selected skill must exist and be active.");
        }

        String fullName = request.fullName().trim();
        String biography = request.biography().trim();
        BigDecimal yearsExperience = normalizeExperience(request.yearsExperience());
        String githubUrl = normalizeOptionalUrl(request.githubUrl());
        String linkedinUrl = normalizeOptionalUrl(request.linkedinUrl());
        String portfolioUrl = normalizeOptionalUrl(request.portfolioUrl());

        List<MentorSkill> existingLinks = mentorSkillRepository.findAllByMentorId(userId);
        Map<Long, MentorSkill> existingBySkillId = new HashMap<>();
        List<MentorSkill> linksToDelete = new ArrayList<>();
        for (MentorSkill link : existingLinks) {
            Long skillId = link.getSkill().getId();
            existingBySkillId.put(skillId, link);
            if (link.getSkill().isActive() && !activeSkillsById.containsKey(skillId)) {
                linksToDelete.add(link);
            }
        }

        account.setFullName(fullName);
        account.setBio(biography);
        account.setGithubUrl(githubUrl);
        account.setLinkedinUrl(linkedinUrl);
        account.setPortfolioUrl(portfolioUrl);
        profile.setBiography(biography);
        profile.setYearsExperience(yearsExperience);
        accountRepository.save(account);
        profileRepository.save(profile);

        if (!linksToDelete.isEmpty()) {
            mentorSkillRepository.deleteAll(linksToDelete);
        }

        List<MentorSkill> linksToSave = new ArrayList<>();
        for (int displayOrder = 0; displayOrder < requestedIds.size(); displayOrder++) {
            Long skillId = requestedIds.get(displayOrder);
            MentorSkill link = existingBySkillId.get(skillId);
            if (link == null) {
                link = new MentorSkill();
                link.setMentor(profile);
                link.setSkill(activeSkillsById.get(skillId));
            }
            link.setDisplayOrder(displayOrder);
            linksToSave.add(link);
        }
        mentorSkillRepository.saveAll(linksToSave);

        return toResponse(account, profile, mentorSkillRepository.findActiveSkillsByMentorId(userId));
    }

    @Transactional(readOnly = true)
    public List<SkillTagResponse> getActiveSkills() {
        return skillRepository.findAllByActiveTrueOrderByNameAsc().stream()
                .map(MentorService::toSkillResponse)
                .toList();
    }

    long requireCurrentActiveMentorId() {
        long userId = resolveDemoUserId();
        getActiveMentorAccount(userId);
        getMentorProfile(userId);
        return userId;
    }

    private long resolveDemoUserId() {
        if (!demoIdentityEnabled || configuredDemoUserId == null || configuredDemoUserId.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE, "Mentor demo identity is not enabled.");
        }
        try {
            long userId = Long.parseLong(configuredDemoUserId);
            if (userId <= 0) {
                throw new NumberFormatException("User ID must be positive.");
            }
            return userId;
        } catch (NumberFormatException exception) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE, "Mentor demo identity is not configured.");
        }
    }

    private MentorAccount getActiveMentorAccount(long userId) {
        MentorAccount account = accountRepository.findById(userId)
                .orElseThrow(() -> notFound("Mentor account was not found."));
        if (!"MENTOR".equals(account.getRoleCode()) || !"ACTIVE".equals(account.getStatus())) {
            throw notFound("Mentor account was not found.");
        }
        return account;
    }

    private MentorProfile getMentorProfile(long userId) {
        return profileRepository.findByUserId(userId)
                .orElseThrow(() -> notFound("Mentor profile was not found."));
    }

    private static void validateRequest(MentorProfileRequest request) {
        if (request == null || request.skillIds() == null || request.skillIds().isEmpty()
                || request.skillIds().size() > MAX_SKILL_SELECTIONS) {
            throw badRequest("Select between 1 and 100 active skills.");
        }
        Set<Long> uniqueIds = new HashSet<>();
        for (Long skillId : request.skillIds()) {
            if (skillId == null || skillId <= 0 || !uniqueIds.add(skillId)) {
                throw badRequest("Skill IDs must be positive and unique.");
            }
        }
        if (request.fullName() == null || request.fullName().trim().isEmpty()
                || request.fullName().trim().length() > 150) {
            throw badRequest("Full name is required and must be at most 150 characters.");
        }
        if (request.biography() == null || request.biography().trim().length() < 50
                || request.biography().trim().length() > 1000) {
            throw badRequest("Biography must contain between 50 and 1000 non-whitespace characters.");
        }
        if (request.yearsExperience() == null
                || request.yearsExperience().compareTo(BigDecimal.ZERO) < 0
                || request.yearsExperience().compareTo(new BigDecimal("80")) > 0) {
            throw badRequest("Years of experience must be between 0 and 80.");
        }
    }

    private static BigDecimal normalizeExperience(BigDecimal yearsExperience) {
        try {
            return yearsExperience.setScale(1, RoundingMode.UNNECESSARY);
        } catch (ArithmeticException exception) {
            throw badRequest("Years of experience can have at most one decimal place.");
        }
    }

    private static String normalizeOptionalUrl(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String normalized = value.trim();
        if (normalized.length() > 500) {
            throw badRequest("Profile links must be at most 500 characters.");
        }
        try {
            URI uri = new URI(normalized);
            String scheme = uri.getScheme();
            if (uri.getHost() == null || uri.getUserInfo() != null
                    || !("http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme))) {
                throw badRequest("Profile links must be valid HTTP or HTTPS URLs.");
            }
        } catch (URISyntaxException exception) {
            throw badRequest("Profile links must be valid HTTP or HTTPS URLs.");
        }
        return normalized;
    }

    private static MentorProfileResponse toResponse(
            MentorAccount account, MentorProfile profile, List<MentorSkill> links) {
        List<MentorSkillResponse> skills = links.stream()
                .map(link -> new MentorSkillResponse(
                        toSkillResponse(link.getSkill()),
                        link.getYearsExperience(),
                        link.isVerified(),
                        link.getDisplayOrder()))
                .toList();
        return new MentorProfileResponse(
                account.getId(),
                account.getFullName(),
                profile.getBiography(),
                profile.getYearsExperience(),
                account.getGithubUrl(),
                account.getLinkedinUrl(),
                account.getPortfolioUrl(),
                skills);
    }

    private static SkillTagResponse toSkillResponse(Skill skill) {
        return new SkillTagResponse(
                skill.getId(),
                skill.getCategoryId(),
                skill.getName(),
                skill.getSlug(),
                skill.getDescription());
    }

    private static ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    private static ResponseStatusException notFound(String message) {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, message);
    }
}
