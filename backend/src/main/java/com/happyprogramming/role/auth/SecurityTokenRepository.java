package com.happyprogramming.role.auth;

import com.happyprogramming.role.auth.SecurityToken;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface SecurityTokenRepository extends JpaRepository<SecurityToken, Long> {
    Optional<SecurityToken> findFirstByUserIdAndPurposeAndUsedAtIsNullOrderByCreatedAtDesc(Long userId, String purpose);
}
