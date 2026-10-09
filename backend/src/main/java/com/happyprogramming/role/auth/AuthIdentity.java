package com.happyprogramming.role.auth;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "auth_identities", schema = "dbo")
public class AuthIdentity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", updatable = false)
    private Long userId;

    @Column(updatable = false)
    private String provider;

    @Column(name = "provider_subject", updatable = false)
    private String providerSubject;

    @Column(name = "provider_email")
    private String providerEmail;

    @Column(name = "last_used_at")
    private LocalDateTime lastUsedAt;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    public static AuthIdentity create(Long userId, String provider, String providerSubject, String providerEmail, LocalDateTime now) {
        var identity = new AuthIdentity();
        identity.userId = userId;
        identity.provider = provider;
        identity.providerSubject = providerSubject;
        identity.providerEmail = providerEmail;
        identity.lastUsedAt = now;
        identity.createdAt = now;
        return identity;
    }

    public Long getId() { return id; }
    public Long getUserId() { return userId; }
    public String getProvider() { return provider; }
    public String getProviderSubject() { return providerSubject; }
    public String getProviderEmail() { return providerEmail; }
    public LocalDateTime getLastUsedAt() { return lastUsedAt; }
    public LocalDateTime getCreatedAt() { return createdAt; }

    public void markUsed(LocalDateTime now) { lastUsedAt = now; }
}
