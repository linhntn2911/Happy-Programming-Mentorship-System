package com.happyprogramming.repository;

import com.happyprogramming.entity.MentorProfile;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MentorProfileRepository extends JpaRepository<MentorProfile, Long> {
    Optional<MentorProfile> findByUserId(Long userId);
}
