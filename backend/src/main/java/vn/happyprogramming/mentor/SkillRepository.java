package vn.happyprogramming.mentor;

import java.util.List;
import java.util.Collection;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SkillRepository extends JpaRepository<Skill, Long> {
    List<Skill> findAllByActiveTrueOrderByNameAsc();

    List<Skill> findAllByActiveTrueAndIdInOrderByNameAsc(Collection<Long> ids);
}
