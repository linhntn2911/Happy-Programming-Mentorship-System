package com.happyprogramming.role.mentor;

import com.happyprogramming.role.mentor.MentorSkill;
import com.happyprogramming.role.mentor.MentorSkillId;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MentorSkillRepository extends JpaRepository<MentorSkill, MentorSkillId> {
    @Query("""
            select mentorSkill
            from MentorSkill mentorSkill
            join fetch mentorSkill.skill
            where mentorSkill.mentor.userId = :mentorId
            """)
    List<MentorSkill> findAllByMentorId(@Param("mentorId") Long mentorId);

    @Query("""
            select mentorSkill
            from MentorSkill mentorSkill
            join fetch mentorSkill.skill skill
            where mentorSkill.mentor.userId = :mentorId
              and skill.active = true
            order by mentorSkill.displayOrder, skill.name
            """)
    List<MentorSkill> findActiveSkillsByMentorId(@Param("mentorId") Long mentorId);

    @org.springframework.data.jpa.repository.Modifying
    @Query(value = """
        IF NOT EXISTS (SELECT 1 FROM dbo.mentor_skills WHERE mentor_id = :mentorId AND skill_id = :skillId)
        BEGIN
            INSERT INTO dbo.mentor_skills (mentor_id, skill_id, display_order, is_verified, created_at)
            VALUES (:mentorId, :skillId, :displayOrder, 0, :now);
        END
    """, nativeQuery = true)
    int linkSkill(
        @Param("mentorId") Long mentorId,
        @Param("skillId") Long skillId,
        @Param("displayOrder") int displayOrder,
        @Param("now") java.time.LocalDateTime now
    );
}
