package com.happyprogramming.role.mentor;

import com.happyprogramming.role.auth.AuthenticatedUser;
import com.happyprogramming.role.mentor.MentorAccount;
import com.happyprogramming.role.mentor.MentorProfile;
import com.happyprogramming.role.mentor.MentorAccountRepository;
import com.happyprogramming.role.mentor.MentorProfileRepository;
import com.happyprogramming.role.mentor.MentorSkillRepository;
import com.happyprogramming.role.mentor.SkillRepository;

import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class MentorServiceTest {
    private final MentorAccountRepository accountRepository = mock(MentorAccountRepository.class);
    private final MentorProfileRepository profileRepository = mock(MentorProfileRepository.class);
    private final SkillRepository skillRepository = mock(SkillRepository.class);
    private final MentorSkillRepository mentorSkillRepository = mock(MentorSkillRepository.class);

    // Demo identity is disabled: a real logged-in mentor must never depend on it.
    private final MentorService service = new MentorService(
            accountRepository, profileRepository, skillRepository, mentorSkillRepository, false, "");

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    private void authenticate(long userId, String role) {
        var principal = new AuthenticatedUser(userId, "Nam Nguyễn", "nam@example.com", role);
        SecurityContextHolder.getContext().setAuthentication(
                UsernamePasswordAuthenticationToken.authenticated(principal, null, List.of()));
    }

    private MentorAccount activeMentorAccount() {
        MentorAccount account = mock(MentorAccount.class);
        when(account.getRoleCode()).thenReturn("MENTOR");
        when(account.getStatus()).thenReturn("ACTIVE");
        return account;
    }

    @Test
    void resolvesDashboardIdentityFromLoggedInMentorWithoutDemoFlag() {
        authenticate(11L, "MENTOR");
        MentorAccount account = activeMentorAccount();
        MentorProfile profile = mock(MentorProfile.class);
        when(accountRepository.findById(11L)).thenReturn(Optional.of(account));
        when(profileRepository.findByUserId(11L)).thenReturn(Optional.of(profile));

        assertEquals(11L, service.requireCurrentActiveMentorId());
        verify(accountRepository).findById(11L);
    }

    @Test
    void rejectsNonMentorSessionEvenWhenDemoWouldOtherwiseApply() {
        authenticate(44L, "MENTEE");
        MentorAccount account = mock(MentorAccount.class);
        when(accountRepository.findById(44L)).thenReturn(Optional.of(account));

        assertThrows(ResponseStatusException.class, () -> service.requireCurrentActiveMentorId());
    }

    @Test
    void unauthenticatedRequestWithoutDemoEnabledIsUnavailable() {
        SecurityContextHolder.clearContext();

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class, () -> service.requireCurrentActiveMentorId());
        assertEquals("Mentor demo identity is not enabled.", exception.getReason());
        verifyNoInteractions(accountRepository);
    }
}
