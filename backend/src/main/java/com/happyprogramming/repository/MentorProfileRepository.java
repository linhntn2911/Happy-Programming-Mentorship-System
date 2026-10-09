package com.happyprogramming.repository;

import com.happyprogramming.entity.MentorProfile;


import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MentorProfileRepository extends JpaRepository<MentorProfile, Long> {
    Optional<MentorProfile> findByUserId(Long userId);

    @Modifying
    @Query(value = """
        IF NOT EXISTS (SELECT 1 FROM dbo.mentor_profiles WHERE user_id = :userId)
        BEGIN
            INSERT INTO dbo.mentor_profiles (
                user_id, slug, headline, job_title, biography,
                years_experience, language_codes,
                is_public, accepting_mentees, max_active_mentees,
                approved_by, approved_at,
                created_at, updated_at
            ) VALUES (
                :userId, CONCAT('mentor-', :userId), 'Programming Mentor', 'Software Engineer',
                'I am a passionate software engineer and mentor dedicated to helping learners grow their programming skills.',
                1.0, N'["vi","en"]',
                1, 1, 5,
                COALESCE((SELECT TOP 1 id FROM dbo.users WHERE role_code IN ('ADMIN', 'STAFF')), :userId), :now,
                :now, :now
            );
        END
        ELSE
        BEGIN
            UPDATE dbo.mentor_profiles
            SET is_public = 1,
                accepting_mentees = 1,
                approved_by = COALESCE(approved_by, (SELECT TOP 1 id FROM dbo.users WHERE role_code IN ('ADMIN', 'STAFF')), :userId),
                approved_at = COALESCE(approved_at, :now),
                updated_at = :now
            WHERE user_id = :userId;
        END
    """, nativeQuery = true)
    int initMentorProfile(
        @Param("userId") Long userId,
        @Param("now") LocalDateTime now
    );

    @Modifying
    @Query(value = """
        IF NOT EXISTS (SELECT 1 FROM dbo.mentor_profiles WHERE user_id = :userId)
        BEGIN
            INSERT INTO dbo.mentor_profiles (
                user_id, slug, headline, job_title, company_name, biography,
                years_experience, experience_summary, language_codes,
                is_public, accepting_mentees, max_active_mentees,
                approved_by, approved_at,
                created_at, updated_at
            ) VALUES (
                :userId, CONCAT('mentor-', :userId), :headline, :jobTitle, :companyName, :biography,
                :yearsExperience, :experienceSummary, N'["vi","en"]',
                1, 1, 5,
                :reviewerId, :now,
                :now, :now
            );
        END
        ELSE
        BEGIN
            UPDATE dbo.mentor_profiles
            SET headline = :headline,
                job_title = :jobTitle,
                company_name = :companyName,
                biography = :biography,
                years_experience = :yearsExperience,
                experience_summary = :experienceSummary,
                is_public = 1,
                accepting_mentees = 1,
                approved_by = COALESCE(approved_by, :reviewerId),
                approved_at = COALESCE(approved_at, :now),
                updated_at = :now
            WHERE user_id = :userId;
        END
    """, nativeQuery = true)
    int upsertApprovedProfile(
        @Param("userId") Long userId,
        @Param("reviewerId") Long reviewerId,
        @Param("headline") String headline,
        @Param("jobTitle") String jobTitle,
        @Param("companyName") String companyName,
        @Param("biography") String biography,
        @Param("yearsExperience") BigDecimal yearsExperience,
        @Param("experienceSummary") String experienceSummary,
        @Param("now") LocalDateTime now
    );
}
