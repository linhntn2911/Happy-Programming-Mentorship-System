package com.happyprogramming.role.auth;

import jakarta.persistence.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.Arrays;

@Entity
@Table(name = "security_tokens", schema = "dbo")
public class SecurityToken {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "token_hash", nullable = false, columnDefinition = "BINARY(32)")
    private byte[] tokenHash;

    @Column(name = "purpose", nullable = false, length = 30)
    private String purpose;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "used_at")
    private LocalDateTime usedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public static byte[] hashToken(Long userId, String code) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            String raw = userId + ":" + code.trim();
            return digest.digest(raw.getBytes(StandardCharsets.UTF_8));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 algorithm missing", e);
        }
    }

    public static SecurityToken createVerifyEmail(Long userId, String code, LocalDateTime now, int expiryMinutes) {
        var token = new SecurityToken();
        token.userId = userId;
        token.tokenHash = hashToken(userId, code);
        token.purpose = "VERIFY_EMAIL";
        token.expiresAt = now.plusMinutes(expiryMinutes);
        token.createdAt = now;
        return token;
    }

    public boolean matches(String code) {
        byte[] expected = hashToken(this.userId, code);
        return MessageDigest.isEqual(this.tokenHash, expected);
    }

    public boolean isValid(LocalDateTime now) {
        return usedAt == null && expiresAt.isAfter(now);
    }

    public void markUsed(LocalDateTime now) {
        this.usedAt = now;
    }

    public Long getId() { return id; }
    public Long getUserId() { return userId; }
    public byte[] getTokenHash() { return tokenHash; }
    public String getPurpose() { return purpose; }
    public LocalDateTime getExpiresAt() { return expiresAt; }
    public LocalDateTime getUsedAt() { return usedAt; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
