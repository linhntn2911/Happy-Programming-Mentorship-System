package com.happyprogramming.service;

import com.happyprogramming.dto.MentorProfileRequest;
import com.happyprogramming.entity.MentorAccount;
import com.happyprogramming.entity.MentorProfile;
import com.happyprogramming.entity.Skill;
import com.happyprogramming.repository.MentorAccountRepository;
import com.happyprogramming.repository.MentorProfileRepository;
import com.happyprogramming.repository.MentorSkillRepository;
import com.happyprogramming.repository.SkillRepository;


import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;

import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;

@SpringBootTest
@SuppressWarnings("null")
@EnabledIfEnvironmentVariable(named = "DB_PASSWORD", matches = ".+")
@TestPropertySource(properties = {
        "hpms.mentor.demo.enabled=true",
        "hpms.mentor.demo.user-id=${HPMS_MENTOR_TEST_USER_ID:0}"
})
class MentorProfileTransactionIntegrationTest {
    @Autowired
    private MentorService mentorService;

    @Autowired
    private MentorAccountRepository accountRepository;

    @Autowired
    private MentorProfileRepository profileRepository;

    @Autowired
    private SkillRepository skillRepository;

    @Autowired
    private EntityManager entityManager;

    @MockitoSpyBean
    private MentorSkillRepository mentorSkillRepository;

    @Test
    void rollsBackAccountAndProfileWhenSkillSynchronizationFails() {
        Assumptions.assumeTrue(System.getenv("DB_PASSWORD") != null
                        && !System.getenv("DB_PASSWORD").isBlank(),
                "DB_PASSWORD is required for the SQL Server rollback integration test");
        String configuredId = System.getenv("HPMS_MENTOR_TEST_USER_ID");
        Assumptions.assumeTrue(configuredId != null && configuredId.matches("[1-9][0-9]*"),
                "HPMS_MENTOR_TEST_USER_ID must identify a local active mentor");

        long userId = Long.parseLong(configuredId);
        MentorAccount beforeAccount = accountRepository.findById(userId).orElseThrow();
        MentorProfile beforeProfile = profileRepository.findByUserId(userId).orElseThrow();
        Skill selectedSkill = skillRepository.findAllByActiveTrueOrderByNameAsc().stream()
                .findFirst()
                .orElseThrow();

        doAnswer(invocation -> {
            entityManager.flush();
            throw new IllegalStateException("Forced rollback");
        }).when(mentorSkillRepository).saveAll(any());

        MentorProfileRequest request = new MentorProfileRequest(
                "Rollback Integration Mentor",
                "A valid biography long enough to satisfy the existing mentor profile database constraints.",
                new BigDecimal("7.0"),
                "https://github.com/rollback-check",
                "",
                "",
                List.of(selectedSkill.getId()));

        assertThrows(IllegalStateException.class, () -> mentorService.updateMyProfile(request));

        MentorAccount afterAccount = accountRepository.findById(userId).orElseThrow();
        MentorProfile afterProfile = profileRepository.findByUserId(userId).orElseThrow();
        assertEquals(beforeAccount.getFullName(), afterAccount.getFullName());
        assertEquals(beforeAccount.getBio(), afterAccount.getBio());
        assertEquals(beforeAccount.getGithubUrl(), afterAccount.getGithubUrl());
        assertEquals(beforeProfile.getBiography(), afterProfile.getBiography());
        assertEquals(beforeProfile.getYearsExperience(), afterProfile.getYearsExperience());
    }
}
