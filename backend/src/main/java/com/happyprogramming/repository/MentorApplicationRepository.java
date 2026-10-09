package com.happyprogramming.repository;

import com.happyprogramming.entity.MentorApplication;

import org.springframework.data.jpa.repository.*;
import jakarta.persistence.LockModeType;
import java.util.*;

public interface MentorApplicationRepository extends JpaRepository<MentorApplication, Long> {
    @Query("select a.applicantId from MentorApplication a where a.id=:id")
    Optional<Long> applicantId(Long id);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<MentorApplication> findFirstByApplicantIdOrderByIdDesc(Long applicantId);
    List<MentorApplication> findTop100ByStatusOrderBySubmittedAtAsc(String status);
    List<MentorApplication> findTop100ByStatusNotOrderBySubmittedAtDesc(String status);
    @Query(value = "SELECT COUNT(*) FROM dbo.user_permissions WHERE user_id=:id AND permission_code='MENTOR_APPLICATION_MANAGE'", nativeQuery = true)
    int reviewerPermission(Long id);
}
