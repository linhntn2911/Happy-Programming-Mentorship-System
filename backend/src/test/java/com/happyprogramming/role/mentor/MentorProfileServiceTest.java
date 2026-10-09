package com.happyprogramming.role.mentor;

import com.happyprogramming.role.mentor.MentorService;
import com.happyprogramming.role.mentor.MentorProfileRequest;
import com.happyprogramming.role.mentor.MentorProfileResponse;
import com.happyprogramming.role.mentor.SkillTagResponse;
import com.happyprogramming.role.mentor.MentorAccount;
import com.happyprogramming.role.mentor.MentorProfile;
import com.happyprogramming.role.mentor.MentorSkill;
import com.happyprogramming.role.mentor.Skill;
import com.happyprogramming.role.mentor.MentorAccountRepository;
import com.happyprogramming.role.mentor.MentorProfileRepository;
import com.happyprogramming.role.mentor.MentorSkillRepository;
import com.happyprogramming.role.mentor.SkillRepository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.StreamSupport;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings({"null", "unchecked"})
class MentorProfileServiceTest {
    @Mock
    private MentorAccountRepository accountRepository;
    @Mock
    private MentorProfileRepository profileRepository;
    @Mock
    private SkillRepository skillRepository;
    @Mock
    private MentorSkillRepository mentorSkillRepository;

    private MentorService service;

    @BeforeEach
    void setUp() {
        service = new MentorService(
                accountRepository, profileRepository, skillRepository, mentorSkillRepository,
                true, "42");
    }

    @Test
    void getProfileCombinesAccountProfileAndActiveSkills() {
        MentorAccount account = account(42L, "Mentor Example", "MENTOR", "ACTIVE");
        MentorProfile profile = profile(42L);
        Skill activeSkill = skill(1L, "Java", true);
        MentorSkill mentorSkill = mentorSkill(profile, activeSkill, true, 0);
        when(accountRepository.findById(42L)).thenReturn(Optional.of(account));
        when(profileRepository.findByUserId(42L)).thenReturn(Optional.of(profile));
        when(mentorSkillRepository.findActiveSkillsByMentorId(42L)).thenReturn(List.of(mentorSkill));

        MentorProfileResponse response = service.getMyProfile();

        assertEquals("Mentor Example", response.fullName());
        assertEquals("I help developers design reliable services and grow their engineering practice.",
                response.biography());
        assertEquals("Java", response.skills().get(0).skill().name());
        assertTrue(response.skills().get(0).verified());
    }

    @Test
    void disabledDemoIdentityFailsBeforeAccessingRepositories() {
        service = new MentorService(
                accountRepository, profileRepository, skillRepository, mentorSkillRepository,
                false, "42");

        ResponseStatusException exception =
                assertThrows(ResponseStatusException.class, service::getMyProfile);

        assertEquals(503, exception.getStatusCode().value());
        verify(accountRepository, never()).findById(42L);
    }

    @Test
    void missingDemoUserIdFailsClosed() {
        service = new MentorService(
                accountRepository, profileRepository, skillRepository, mentorSkillRepository,
                true, "");

        ResponseStatusException exception =
                assertThrows(ResponseStatusException.class, service::getMyProfile);

        assertEquals(503, exception.getStatusCode().value());
        verify(accountRepository, never()).findById(42L);
    }

    @Test
    void demoIdentityMustBelongToAnActiveMentor() {
        List<MentorAccount> accounts = List.of(
                account(42L, "Example", "MENTEE", "ACTIVE"),
                account(42L, "Example", "MENTOR", "INACTIVE"),
                account(42L, "Example", "MENTOR", "LOCKED"));
        AtomicInteger nextAccount = new AtomicInteger();
        when(accountRepository.findById(42L))
                .thenAnswer(invocation -> Optional.of(accounts.get(nextAccount.getAndIncrement())));
        for (int attempt = 0; attempt < 3; attempt++) {
            ResponseStatusException exception =
                    assertThrows(ResponseStatusException.class, service::getMyProfile);
            assertEquals(404, exception.getStatusCode().value());
        }
        verify(profileRepository, never()).findByUserId(42L);
    }

    @Test
    void rejectsInvalidSkillSelectionBeforeChangingProfileFields() {
        MentorAccount account = account(42L, "Before", "MENTOR", "ACTIVE");
        MentorProfile profile = profile(42L);
        when(accountRepository.findById(42L)).thenReturn(Optional.of(account));
        when(profileRepository.findByUserId(42L)).thenReturn(Optional.of(profile));
        when(skillRepository.findAllByActiveTrueAndIdInOrderByNameAsc(anyCollection()))
                .thenReturn(List.of());
        MentorProfileRequest request = request(List.of(7L));

        ResponseStatusException exception =
                assertThrows(ResponseStatusException.class, () -> service.updateMyProfile(request));

        assertEquals(400, exception.getStatusCode().value());
        assertEquals("Before", account.getFullName());
        verify(accountRepository, never()).save(account);
        verify(profileRepository, never()).save(profile);
        verify(mentorSkillRepository, never()).saveAll(anyCollection());
    }

    @Test
    void rejectsDuplicateSkillIdsBeforeRepositoryWrites() {
        MentorProfileRequest request = request(List.of(7L, 7L));

        ResponseStatusException exception =
                assertThrows(ResponseStatusException.class, () -> service.updateMyProfile(request));

        assertEquals(400, exception.getStatusCode().value());
        verify(accountRepository, never()).findById(42L);
    }

    @Test
    void listsOnlySkillsReturnedByActiveCatalogQuery() {
        when(skillRepository.findAllByActiveTrueOrderByNameAsc()).thenReturn(
                List.of(skill(1L, "Java", true), skill(2L, "Spring", true)));

        List<SkillTagResponse> skills = service.getActiveSkills();

        assertEquals(List.of("Java", "Spring"), skills.stream().map(SkillTagResponse::name).toList());
    }

    @Test
    void updatesProfileAndSynchronizesOnlyActiveSkillLinks() {
        MentorAccount account = account(42L, "Before", "MENTOR", "ACTIVE");
        MentorProfile profile = profile(42L);
        Skill retainedSkill = skill(1L, "Java", true);
        Skill removedSkill = skill(2L, "Python", true);
        Skill inactiveSkill = skill(3L, "Old Skill", false);
        Skill addedSkill = skill(4L, "Spring", true);
        MentorSkill retainedLink = mentorSkill(profile, retainedSkill, true, 3);
        retainedLink.setVerifiedBy(99L);
        MentorSkill removedLink = mentorSkill(profile, removedSkill, false, 4);
        MentorSkill inactiveLink = mentorSkill(profile, inactiveSkill, false, 5);

        when(accountRepository.findById(42L)).thenReturn(Optional.of(account));
        when(profileRepository.findByUserId(42L)).thenReturn(Optional.of(profile));
        when(skillRepository.findAllByActiveTrueAndIdInOrderByNameAsc(anyCollection()))
                .thenReturn(List.of(retainedSkill, addedSkill));
        when(mentorSkillRepository.findAllByMentorId(42L))
                .thenReturn(List.of(retainedLink, removedLink, inactiveLink));
        when(mentorSkillRepository.findActiveSkillsByMentorId(42L))
                .thenReturn(List.of(retainedLink));

        service.updateMyProfile(request(List.of(1L, 4L)));

        assertEquals("Updated Mentor", account.getFullName());
        assertEquals("Updated biography with enough detail to meet the profile requirements.", account.getBio());
        assertEquals(account.getBio(), profile.getBiography());
        assertEquals(new BigDecimal("8.5"), profile.getYearsExperience());
        assertEquals("https://github.com/example", account.getGithubUrl());
        assertTrue(retainedLink.isVerified());
        assertEquals(99L, retainedLink.getVerifiedBy());
        verify(mentorSkillRepository).deleteAll(List.of(removedLink));
        verify(mentorSkillRepository, never()).delete(inactiveLink);
        ArgumentCaptor<Iterable<MentorSkill>> savedLinks = ArgumentCaptor.forClass(Iterable.class);
        verify(mentorSkillRepository).saveAll(savedLinks.capture());
        MentorSkill addedLink = StreamSupport.stream(savedLinks.getValue().spliterator(), false)
                .filter(link -> link.getSkill().getId().equals(4L))
                .findFirst()
                .orElseThrow();
        assertEquals(4L, addedLink.getSkill().getId());
        assertEquals(1, addedLink.getDisplayOrder());
        assertFalse(addedLink.isVerified());
    }

    private static MentorProfileRequest request(List<Long> skillIds) {
        return new MentorProfileRequest(
                "Updated Mentor",
                "Updated biography with enough detail to meet the profile requirements.",
                new BigDecimal("8.5"),
                "https://github.com/example",
                "",
                "",
                skillIds);
    }

    private static MentorAccount account(Long id, String name, String role, String status) {
        MentorAccount account = new MentorAccount();
        account.setId(id);
        account.setFullName(name);
        account.setRoleCode(role);
        account.setStatus(status);
        return account;
    }

    private static MentorProfile profile(Long id) {
        MentorProfile profile = new MentorProfile();
        profile.setUserId(id);
        profile.setBiography("I help developers design reliable services and grow their engineering practice.");
        profile.setYearsExperience(new BigDecimal("6.0"));
        return profile;
    }

    private static Skill skill(Long id, String name, boolean active) {
        Skill skill = new Skill();
        skill.setId(id);
        skill.setName(name);
        skill.setActive(active);
        skill.setSlug(name.toLowerCase().replace(' ', '-'));
        return skill;
    }

    private static MentorSkill mentorSkill(
            MentorProfile profile, Skill skill, boolean verified, int displayOrder) {
        MentorSkill mentorSkill = new MentorSkill();
        mentorSkill.setMentor(profile);
        mentorSkill.setSkill(skill);
        mentorSkill.setVerified(verified);
        mentorSkill.setDisplayOrder(displayOrder);
        return mentorSkill;
    }
}
