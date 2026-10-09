package com.happyprogramming.service;

import com.happyprogramming.repository.AuthIdentityRepository;
import com.happyprogramming.repository.SecurityTokenRepository;
import com.happyprogramming.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Clock;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class AuthServiceGoogleTest {
    @Test
    void googleLoginDoesNotCreateOrLinkAnIdentityByEmail() {
        var users = mock(UserRepository.class);
        var identities = mock(AuthIdentityRepository.class);
        var passwords = mock(PasswordEncoder.class);
        when(passwords.encode(anyString())).thenReturn("dummy-hash");
        when(identities.findByProviderAndProviderSubject("GOOGLE", "subject-123"))
            .thenReturn(Optional.empty());

        var auth = new AuthService(
            users,
            identities,
            mock(SecurityTokenRepository.class),
            mock(EmailService.class),
            passwords,
            Clock.systemUTC()
        );

        assertTrue(auth.google(
            "subject-123",
            "existing@example.invalid",
            "Existing Account",
            "Existing",
            "Account",
            "MENTEE"
        ).isEmpty());
        verifyNoInteractions(users);
        verify(identities, never()).save(any());
    }
}
