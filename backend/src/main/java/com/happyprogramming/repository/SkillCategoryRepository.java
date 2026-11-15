package com.happyprogramming.repository;

import com.happyprogramming.entity.SkillCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SkillCategoryRepository extends JpaRepository<SkillCategory, Long> {
    List<SkillCategory> findAllByActiveTrueOrderByDisplayOrderAscIdAsc();
    boolean existsByNameIgnoreCase(String name);
    boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);
    boolean existsBySlugIgnoreCase(String slug);
}
