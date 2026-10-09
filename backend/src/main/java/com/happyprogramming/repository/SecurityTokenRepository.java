package com.happyprogramming.repository;

import com.happyprogramming.entity.SecurityToken;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface SecurityTokenRepository extends JpaRepository<SecurityToken, Long> {
    Optional<SecurityToken> findFirstByUserIdAndPurposeAndUsedAtIsNullOrderByCreatedAtDesc(Long userId, String purpose);
}
