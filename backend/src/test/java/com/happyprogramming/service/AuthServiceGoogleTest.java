package com.happyprogramming.service;

import com.happyprogramming.entity.AuthIdentity;
import com.happyprogramming.entity.User;
import com.happyprogramming.repository.AuthIdentityRepository;
import com.happyprogramming.repository.SecurityTokenRepository;
import com.happyprogramming.repository.UserRepository;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class AuthServiceGoogleTest {
    @Test
    void googleLoginLinksExistingUserByVerifiedEmail() {
        var users = mock(UserRepository.class);
        var identities = mock(AuthIdentityRepository.class);
        var passwords = mock(PasswordEncoder.class);
        when(passwords.encode(anyString())).thenReturn("dummy-hash");
        when(identities.findByProviderAndProviderSubject("GOOGLE", "subject-123"))
            .thenReturn(Optional.empty());

        var existingUser = User.createMentee("test@gmail.com", "Test", "User", "dummy", LocalDateTime.now());
        existingUser.activateEmail(LocalDateTime.now());
        when(users.findForLogin("test@gmail.com")).thenReturn(Optional.of(existingUser));
        when(identities.save(any(AuthIdentity.class))).thenAnswer(i -> i.getArgument(0));

        var auth = new AuthService(
            users,
            identities,
            mock(SecurityTokenRepository.class),
            mock(EmailService.class),
            passwords,
            Clock.systemUTC()
        );

        var result = auth.google(
            "subject-123",
            "test@gmail.com",
            "Test User",
            "Test",
            "User",
            "MENTEE"
        );
        assertTrue(result.isPresent());
        verify(identities).save(any(AuthIdentity.class));
    }

    @Test
    void googleLoginCreatesNewUserWhenNotExists() {
        var users = mock(UserRepository.class);
        var identities = mock(AuthIdentityRepository.class);
        var passwords = mock(PasswordEncoder.class);
        when(passwords.encode(anyString())).thenReturn("dummy-hash");
        when(identities.findByProviderAndProviderSubject("GOOGLE", "subject-456"))
            .thenReturn(Optional.empty());
        when(users.findForLogin("new@gmail.com")).thenReturn(Optional.empty());
        when(users.save(any(User.class))).thenAnswer(i -> i.getArgument(0));
        when(identities.save(any(AuthIdentity.class))).thenAnswer(i -> i.getArgument(0));

        var auth = new AuthService(
            users,
            identities,
            mock(SecurityTokenRepository.class),
            mock(EmailService.class),
            passwords,
            Clock.systemUTC()
        );

        var result = auth.google(
            "subject-456",
            "new@gmail.com",
            "New User",
            "New",
            "User",
            "MENTEE"
        );
        assertTrue(result.isPresent());
        verify(users).save(any(User.class));
        verify(identities).save(any(AuthIdentity.class));
    }
}