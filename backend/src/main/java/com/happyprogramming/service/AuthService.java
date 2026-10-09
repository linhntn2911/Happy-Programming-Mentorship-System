package com.happyprogramming.service;

import com.happyprogramming.dto.AuthenticatedUser;
import com.happyprogramming.dto.LoginRequest;
import com.happyprogramming.dto.MenteeSignupRequest;
import com.happyprogramming.dto.SignupResponse;
import com.happyprogramming.entity.SecurityToken;
import com.happyprogramming.entity.User;
import com.happyprogramming.repository.AuthIdentityRepository;
import com.happyprogramming.repository.SecurityTokenRepository;
import com.happyprogramming.repository.UserRepository;


import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.util.*;

@Service
public class AuthService {
    private final UserRepository users;
    private final AuthIdentityRepository identities;
    private final SecurityTokenRepository securityTokens;
    private final EmailService emailService;
    private final PasswordEncoder passwords;
    private final Clock clock;
    private final String dummyHash;

    private static final Set<String> COMMON_PASSWORDS = Set.of(
        "password", "password123", "12345678", "123456789", "qwerty123", "admin123", "letmein123"
    );

    public AuthService(UserRepository users, AuthIdentityRepository identities, SecurityTokenRepository securityTokens,
                       EmailService emailService, PasswordEncoder passwords, Clock clock) {
        this.users = users;
        this.identities = identities;
        this.securityTokens = securityTokens;
        this.emailService = emailService;
        this.passwords = passwords;
        this.clock = clock;
        this.dummyHash = passwords.encode(UUID.randomUUID().toString());
    }

    @Transactional
    public SignupResponse signupMentee(MenteeSignupRequest request) {
        String email = request.email().trim();
        String normalizedEmail = email.toLowerCase(Locale.ROOT);
        var existing = users.findForLogin(normalizedEmail).orElse(null);
        if (existing != null) {
            throw new DuplicateEmailException("An account with this email address already exists. Please log in instead.");
        }
        validatePasswordPolicy(request.password());
        var now = LocalDateTime.now(clock);
        String hash = passwords.encode(request.password());

        User user;
        if (existing != null) {
            user = existing;
        } else {
            user = User.createMentee(email, request.firstName().trim(), request.lastName().trim(), hash, now);
            user = users.save(user);
        }

        String otp = String.format("%06d", java.util.concurrent.ThreadLocalRandom.current().nextInt(1000000));
        var token = com.happyprogramming.entity.SecurityToken.createVerifyEmail(user.getId(), otp, now, 10);
        securityTokens.save(token);

        emailService.sendOtpEmail(user.getEmail(), user.getFirstName(), otp);

        return new SignupResponse(user.getEmail(), true, "Verification code sent to " + user.getEmail());
    }

    @Transactional
    public AuthenticatedUser verifyOtp(String email, String code) {
        var user = users.findForLogin(email.trim().toLowerCase(Locale.ROOT)).orElseThrow(
            () -> new IllegalArgumentException("User not found with email: " + email)
        );
        var now = LocalDateTime.now(clock);
        if (!"INACTIVE".equals(user.getStatus()) || user.getEmailVerifiedAt() != null)
            throw new IllegalArgumentException("This account cannot be activated. Please log in or contact support.");
        var token = securityTokens.findFirstByUserIdAndPurposeAndUsedAtIsNullOrderByCreatedAtDesc(user.getId(), "VERIFY_EMAIL")
            .orElseThrow(() -> new IllegalArgumentException("No pending verification code found. Please request a new one."));

        if (!token.isValid(now) || !token.matches(code)) {
            throw new IllegalArgumentException("Invalid or expired verification code. Please check and try again.");
        }

        token.markUsed(now);
        user.activateEmail(now);
        user.recordLogin(now);
        return AuthenticatedUser.from(user);
    }

    @Transactional
    public void resendOtp(String email) {
        var user = users.findForLogin(email.trim().toLowerCase(Locale.ROOT)).orElseThrow(
            () -> new IllegalArgumentException("No account found with this email.")
        );
        if ("ACTIVE".equals(user.getStatus()) && user.getEmailVerifiedAt() != null) {
            throw new IllegalArgumentException("This account is already verified. Please log in.");
        }
        var now = LocalDateTime.now(clock);
        String otp = String.format("%06d", java.util.concurrent.ThreadLocalRandom.current().nextInt(1000000));
        var token = com.happyprogramming.entity.SecurityToken.createVerifyEmail(user.getId(), otp, now, 10);
        securityTokens.save(token);

        emailService.sendOtpEmail(user.getEmail(), user.getFirstName(), otp);
    }

    public void validatePasswordPolicy(String password) {
        if (password == null || password.length() < 8) {
            throw new IllegalArgumentException("Password must be at least 8 characters.");
        }
        if (password.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new IllegalArgumentException("Password is too long (maximum 72 bytes).");
        }
        boolean hasLower = false;
        boolean hasUpper = false;
        for (char c : password.toCharArray()) {
            if (Character.isLowerCase(c)) hasLower = true;
            if (Character.isUpperCase(c)) hasUpper = true;
        }
        if (!hasLower) {
            throw new IllegalArgumentException("Password must include at least one lowercase character.");
        }
        if (!hasUpper) {
            throw new IllegalArgumentException("Password must include at least one uppercase character.");
        }
        if (COMMON_PASSWORDS.contains(password.toLowerCase(Locale.ROOT))) {
            throw new IllegalArgumentException("Password is too common. Please choose a stronger password.");
        }
    }

    @Transactional
    public Optional<AuthenticatedUser> login(LoginRequest request) {
        // BCrypt accepts at most 72 UTF-8 bytes; reject instead of truncating or throwing.
        if (request.password().getBytes(StandardCharsets.UTF_8).length > 72) return Optional.empty();
        var user = users.findForLogin(request.email().trim().toLowerCase(Locale.ROOT)).orElse(null);
        var now = LocalDateTime.now(clock);
        String effectiveRole = (request.role() != null && !request.role().isBlank())
            ? request.role().trim().toUpperCase(Locale.ROOT)
            : (user != null ? user.getRoleCode() : null);
        if (user == null || effectiveRole == null || !eligible(user, effectiveRole, now)) {
            passwords.matches(request.password(), dummyHash);
            return Optional.empty();
        }
        user.resetExpiredLock(now);
        String hash = user.getPasswordHash();
        if (hash != null && hash.startsWith("{bcrypt}")) hash = hash.substring(8);
        boolean supported = hash != null && hash.matches("\\$2[aby]\\$\\d{2}\\$[./A-Za-z0-9]{53}");
        boolean valid = passwords.matches(request.password(), supported ? hash : dummyHash);
        if (!supported || !valid) {
            user.recordFailure(now);
            return Optional.empty(); // commit failure counters instead of rolling back an exception
        }
        user.recordLogin(now);
        return Optional.of(AuthenticatedUser.from(user, effectiveRole));
    }

    @Transactional(readOnly = true)
    public Optional<AuthenticatedUser> current(AuthenticatedUser principal) {
        return users.findById(principal.id())
            .filter(u -> eligible(u, principal.role(), LocalDateTime.now(clock)))
            .map(u -> AuthenticatedUser.from(u, principal.role()));
    }

    @Transactional
    public Optional<AuthenticatedUser> google(String subject, String email, String fullName, String firstName, String lastName, String role) {
        String effectiveRole = (role != null && Set.of("MENTEE", "MENTOR").contains(role)) ? role : "MENTEE";
        var identity = identities.findByProviderAndProviderSubject("GOOGLE", subject).orElse(null);
        var now = LocalDateTime.now(clock);

        if (identity == null) return Optional.empty();
        var user = users.findForLoginById(identity.getUserId()).orElse(null);
        if (user == null || !eligible(user, effectiveRole, now)) return Optional.empty();
        user.recordLogin(now);
        identity.markUsed(now);
        return Optional.of(AuthenticatedUser.from(user, effectiveRole));
    }

    @Transactional
    public Optional<AuthenticatedUser> google(String subject, String role) {
        return google(subject, null, null, null, null, role);
    }

    private boolean eligible(User user, String role, LocalDateTime now) {
        return "ACTIVE".equals(user.getStatus()) && user.hasRole(role)
            && Set.of("MENTEE", "MENTOR", "STAFF", "ADMIN").contains(role)
            && (user.getLockedUntil() == null || !user.getLockedUntil().isAfter(now));
    }
}
