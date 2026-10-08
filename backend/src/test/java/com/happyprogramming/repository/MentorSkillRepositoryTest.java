package com.happyprogramming.repository;

import static org.junit.jupiter.api.Assertions.assertTrue;

import java.lang.reflect.Method;
import org.junit.jupiter.api.Test;
import org.springframework.data.jpa.repository.Query;

class MentorSkillRepositoryTest {
    @Test
    void activeMentorSkillQueryFiltersInactiveCatalogSkills() throws Exception {
        Method queryMethod = MentorSkillRepository.class.getMethod("findActiveSkillsByMentorId", Long.class);
        String query = queryMethod.getAnnotation(Query.class).value();

        assertTrue(query.contains("skill.active = true"));
        assertTrue(query.contains("join fetch mentorSkill.skill"));
        assertTrue(query.contains("mentorSkill.displayOrder"));
    }
}
