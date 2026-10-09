package com.happyprogramming.role.auth;

import com.happyprogramming.role.auth.AuthIdentity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface AuthIdentityRepository extends JpaRepository<AuthIdentity, Long> {
    Optional<AuthIdentity> findByProviderAndProviderSubject(String provider, String providerSubject);
}
