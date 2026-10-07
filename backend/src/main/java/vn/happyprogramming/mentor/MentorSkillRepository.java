package vn.happyprogramming.mentor;

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
}
